/**
 * ONE-OFF, NOT part of `npm run db:seed`. Run manually.
 *
 * WIF 2026 registration collects a biodata block inline (name, passport, WeChat,
 * China phone, city, university, major, cohort, student card). For registrants
 * who filled it in the FORM (biodataJson.source === "form" - i.e. their census
 * was not complete), that data was frozen into the registration snapshot and
 * never reached their `sensus_profiles`. So 95+ WIF registrants still show
 * "belum lengkap" and would have to re-type everything in /sensus.
 *
 * This copies the overlapping fields into each person's `sensus_profiles`:
 *   fullName, passportNumber, wechatId, phoneActive(<-chinaPhone), branch,
 *   university, major, entryYear, studentCardUrl(<-studentProofUrl)
 *
 * SAFE BY DESIGN:
 *   - Dry-run by default. `--apply` to write.
 *   - Only fills columns that are currently NULL / "" - never overwrites what
 *     the person typed in the census itself.
 *   - Does NOT touch completion_status. They still finish /sensus (which asks
 *     ~10 more fields); this just pre-fills the overlap.
 *   - passport_number is UNIQUE: skipped + reported if the value already sits on
 *     a different sensus row.
 *   - The student card (a PUBLIC event-doc blob) is copied into the PRIVATE
 *     sensus store and stored as the /api/sensus/student-card/... proxy path,
 *     same as a fresh census upload. Old event-doc blob is left in place.
 *   - Rows that do not exist yet are created as `incomplete`.
 *
 * Usage:
 *   npx tsx --env-file=.env src/db/backfill-wif-biodata-to-sensus.ts
 *   npx tsx --env-file=.env src/db/backfill-wif-biodata-to-sensus.ts --apply
 */
import { put } from "@vercel/blob";
import { and, eq, ne, inArray } from "drizzle-orm";
import { db } from "./index";
import { events, eventRegistrations, sensusProfiles, users } from "./schema";
import type { EventBiodata } from "./schema";

const APPLY = process.argv.includes("--apply");
const PRIVATE_TOKEN = process.env.PRIVATE_READ_WRITE_TOKEN;
const BLOB_RE = /^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i;
const PROXY_PREFIX = "/api/sensus/student-card/";

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

async function copyCardToPrivate(userId: string, sourceUrl: string): Promise<string | null> {
  if (!BLOB_RE.test(sourceUrl)) return null;
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`fetch card ${res.status}`);
  const bytes = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const base = (sourceUrl.split("/").pop() || "card").split("?")[0].replace(/[^\w.\-]+/g, "_").slice(0, 100);
  const pathname = `sensus/${userId}/${Date.now()}-${base}`;
  const uploaded = await put(pathname, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token: PRIVATE_TOKEN,
  });
  if (uploaded.pathname !== pathname) throw new Error("pathname drift");
  return PROXY_PREFIX + pathname.split("/").map(encodeURIComponent).join("/");
}

async function main() {
  if (!PRIVATE_TOKEN) {
    console.error("PRIVATE_READ_WRITE_TOKEN not set - aborting.");
    process.exit(1);
  }
  console.log(`mode: ${APPLY ? "APPLY (writing!)" : "DRY RUN (no writes)"}\n`);

  const [wif] = await db.select().from(events).where(eq(events.slug, "wif-2026"));
  const regs = await db
    .select({ userId: eventRegistrations.userId, bj: eventRegistrations.biodataJson })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, wif.id), ne(eventRegistrations.status, "cancelled")));

  const formRegs = regs.filter((r) => (r.bj as EventBiodata | null)?.source === "form");
  console.log(`WIF non-cancelled: ${regs.length}, of which source="form": ${formRegs.length}\n`);

  const userIds = formRegs.map((r) => r.userId);
  const profiles = await db.select().from(sensusProfiles).where(inArray(sensusProfiles.userId, userIds));
  const profByUser = new Map(profiles.map((p) => [p.userId, p]));
  const accts = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
  const acctByUser = new Map(accts.map((a) => [a.id, a]));

  let created = 0;
  let patched = 0;
  let unchanged = 0;
  let passportSkips = 0;
  let cardCopied = 0;
  let failed = 0;

  for (const reg of formRegs) {
    const bio = reg.bj as EventBiodata;
    const prof = profByUser.get(reg.userId) ?? null;
    const acct = acctByUser.get(reg.userId);
    const who = `${acct?.name ?? "?"} <${acct?.email ?? reg.userId}>`;

    const patch: Record<string, unknown> = {};
    const consider = (col: string, current: unknown, incoming: string | undefined) => {
      if (!blank(current) || blank(incoming)) return;
      patch[col] = incoming!.trim();
    };
    consider("fullName", prof?.fullName, bio.fullName);
    consider("wechatId", prof?.wechatId, bio.wechatId);
    consider("phoneActive", prof?.phoneActive, bio.chinaPhone);
    consider("branch", prof?.branch, bio.branch);
    consider("university", prof?.university, bio.university);
    consider("major", prof?.major, bio.major);

    if (blank(prof?.entryYear) && !blank(bio.entryYear)) {
      const y = parseInt(bio.entryYear, 10);
      if (Number.isInteger(y) && y >= 2000 && y <= 2100) patch.entryYear = y;
    }

    // passport - respect the UNIQUE constraint
    if (blank(prof?.passportNumber) && !blank(bio.passportNumber)) {
      const pp = bio.passportNumber.trim();
      const clash = await db
        .select({ id: sensusProfiles.id })
        .from(sensusProfiles)
        .where(and(eq(sensusProfiles.passportNumber, pp), ne(sensusProfiles.userId, reg.userId)));
      if (clash.length > 0) {
        console.log(`  ! ${who}: passport ${pp} already on another sensus row - skipping that field`);
        passportSkips++;
      } else {
        patch.passportNumber = pp;
      }
    }

    // student card - copy the public event-doc blob into the private sensus store
    if (blank(prof?.studentCardUrl) && !blank(bio.studentProofUrl)) {
      if (APPLY) {
        try {
          const proxied = await copyCardToPrivate(reg.userId, bio.studentProofUrl);
          if (proxied) {
            patch.studentCardUrl = proxied;
            cardCopied++;
          }
        } catch (e) {
          console.log(`  x ${who}: card copy failed (${(e as Error).message}) - other fields still applied`);
          failed++;
        }
      } else {
        patch.studentCardUrl = "(copy card to private store)";
        cardCopied++;
      }
    }

    if (Object.keys(patch).length === 0) {
      unchanged++;
      continue;
    }

    console.log(`  ${APPLY ? "->" : "would"} ${prof ? "patch" : "CREATE"} ${who}: ${Object.keys(patch).join(", ")}`);

    if (!APPLY) {
      if (prof) patched++;
      else created++;
      continue;
    }

    if (prof) {
      await db
        .update(sensusProfiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(sensusProfiles.userId, reg.userId));
      patched++;
    } else {
      await db.insert(sensusProfiles).values({
        userId: reg.userId,
        completionStatus: "incomplete",
        updatedAt: new Date(),
        ...patch,
      });
      created++;
    }
  }

  console.log(
    `\n${APPLY ? "applied" : "would apply"}: ${patched} patched, ${created} created, ${unchanged} already complete on these fields, ` +
      `${passportSkips} passport-clash skips, ${cardCopied} cards ${APPLY ? "copied" : "to copy"}, ${failed} card failures`,
  );
  console.log(APPLY ? "\nDONE. completion_status untouched - they still finish /sensus." : "\nDRY RUN - no writes.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
