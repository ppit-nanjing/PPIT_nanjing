/**
 * ONE-OFF, NOT part of `npm run db:seed`. Run manually, once, AFTER
 * `fix/sensus-blob-private` (PR #24) is deployed to production.
 *
 * Moves existing sensus student-card / LOA scans (KTM) from the OLD public Blob
 * store to the NEW private store, and repoints the DB at the auth-gated proxy
 * path `/api/sensus/student-card/...`.
 *
 * Touches:
 *   - sensus_profiles.student_card_url        (the ~24 census cards)
 *   - event_registrations.biodataJson.studentProofUrl  — ONLY the snapshots
 *     whose value is one of those sensus URLs (source:"sensus"). `event-doc`
 *     uploads (source:"form") are left alone — that folder is still public.
 *
 * SAFE BY DESIGN:
 *   - Dry-run by default. Pass `--apply` to write.
 *   - Old public blobs are NEVER deleted here (they back the snapshots until a
 *     later, separate cleanup pass once everything is verified in prod).
 *   - Each blob is re-fetched, re-uploaded private, then read back from the
 *     private store and byte-size-checked BEFORE the DB row is touched.
 *   - The UPDATE is guarded on the old value (`... AND student_card_url = $old`)
 *     so a card re-uploaded by the owner mid-migration is skipped, not clobbered.
 *   - Idempotent: re-running skips rows already on a proxy path.
 *
 * Usage:
 *   npx tsx --env-file=.env src/db/migrate-sensus-blob-private.ts            # dry run
 *   npx tsx --env-file=.env src/db/migrate-sensus-blob-private.ts --apply    # execute
 *   npx tsx --env-file=.env src/db/migrate-sensus-blob-private.ts --verify   # re-check after
 */
import { put, get } from "@vercel/blob";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "./index";
import { sensusProfiles, eventRegistrations } from "./schema";

const APPLY = process.argv.includes("--apply");
const VERIFY_ONLY = process.argv.includes("--verify");
const PRIVATE_TOKEN = process.env.PRIVATE_READ_WRITE_TOKEN;

const PUBLIC_BLOB_RE = /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/(.+)$/i;
const PROXY_PREFIX = "/api/sensus/student-card/";

// Exact same transform the upload route uses to build the proxy URL from a
// blob pathname (src/app/api/upload/route.ts).
function proxyUrlFor(pathname: string): string {
  return PROXY_PREFIX + pathname.split("/").map(encodeURIComponent).join("/");
}

function pathnameFromPublicUrl(url: string): string | null {
  const m = url.match(PUBLIC_BLOB_RE);
  if (!m) return null;
  // Strip any query string; decode the path segments back to storage form.
  const raw = m[1].split("?")[0];
  return raw
    .split("/")
    .map((s) => decodeURIComponent(s))
    .join("/");
}

async function verify() {
  const rows = await db
    .select({ id: sensusProfiles.id, url: sensusProfiles.studentCardUrl })
    .from(sensusProfiles)
    .where(isNotNull(sensusProfiles.studentCardUrl));
  let ok = 0;
  let bad = 0;
  for (const r of rows) {
    const url = r.url ?? "";
    if (!url.startsWith(PROXY_PREFIX)) {
      console.log(`  ✗ [${r.id}] not a proxy path: ${url.slice(0, 80)}`);
      bad++;
      continue;
    }
    const pathname = decodeURIComponent(url.slice(PROXY_PREFIX.length));
    try {
      const blob = await get(pathname, { access: "private", token: PRIVATE_TOKEN });
      if (blob?.stream && blob.blob.size > 0) {
        ok++;
      } else {
        console.log(`  ✗ [${r.id}] private get returned nothing: ${pathname}`);
        bad++;
      }
    } catch (e) {
      console.log(`  ✗ [${r.id}] private get threw: ${(e as Error).message}`);
      bad++;
    }
  }
  console.log(`\nverify: ${ok} readable from private store, ${bad} problems, ${rows.length} total`);
}

async function main() {
  if (!PRIVATE_TOKEN) {
    console.error("PRIVATE_READ_WRITE_TOKEN is not set — aborting.");
    process.exit(1);
  }
  console.log(`mode: ${VERIFY_ONLY ? "VERIFY" : APPLY ? "APPLY (writing!)" : "DRY RUN (no writes)"}\n`);

  if (VERIFY_ONLY) {
    await verify();
    return;
  }

  const rows = await db
    .select({ id: sensusProfiles.id, userId: sensusProfiles.userId, url: sensusProfiles.studentCardUrl })
    .from(sensusProfiles)
    .where(isNotNull(sensusProfiles.studentCardUrl));

  console.log(`sensus_profiles with a student_card_url: ${rows.length}`);

  // oldPublicUrl -> newProxyUrl, for the event_registrations snapshot pass.
  const remap = new Map<string, string>();
  let migrated = 0;
  let skippedAlready = 0;
  let failed = 0;

  for (const r of rows) {
    const oldUrl = r.url ?? "";
    if (oldUrl.startsWith(PROXY_PREFIX)) {
      skippedAlready++;
      continue;
    }
    const pathname = pathnameFromPublicUrl(oldUrl);
    if (!pathname || !pathname.startsWith(`sensus/${r.userId}/`)) {
      console.log(`  ✗ [${r.id}] unexpected url shape, leaving as-is: ${oldUrl.slice(0, 90)}`);
      failed++;
      continue;
    }
    const newUrl = proxyUrlFor(pathname);

    // 1. fetch the current (public) bytes
    let bytes: ArrayBuffer;
    let contentType: string;
    try {
      const res = await fetch(oldUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      bytes = await res.arrayBuffer();
      contentType = res.headers.get("content-type") || "application/octet-stream";
    } catch (e) {
      console.log(`  ✗ [${r.id}] cannot fetch old blob (${(e as Error).message}) — leaving as-is`);
      failed++;
      continue;
    }

    console.log(
      `  ${APPLY ? "→" : "would"} [${r.id}] ${pathname}  (${(bytes.byteLength / 1024).toFixed(0)} KB, ${contentType})`,
    );

    if (!APPLY) {
      remap.set(oldUrl, newUrl);
      migrated++;
      continue;
    }

    // 2. upload to the PRIVATE store at the exact same pathname
    let putPathname: string;
    try {
      const uploaded = await put(pathname, bytes, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        token: PRIVATE_TOKEN,
      });
      putPathname = uploaded.pathname;
      if (putPathname !== pathname) throw new Error(`pathname drift: ${putPathname} != ${pathname}`);
    } catch (e) {
      console.log(`  ✗ [${r.id}] private put failed (${(e as Error).message}) — leaving as-is`);
      failed++;
      continue;
    }

    // 3. read it back from the private store and size-check
    try {
      const back = await get(pathname, { access: "private", token: PRIVATE_TOKEN });
      if (!back?.stream || back.blob.size !== bytes.byteLength) {
        throw new Error(`readback mismatch: size ${back?.blob?.size} != ${bytes.byteLength}`);
      }
    } catch (e) {
      console.log(`  ✗ [${r.id}] private readback failed (${(e as Error).message}) — DB NOT touched`);
      failed++;
      continue;
    }

    // 4. repoint the row — guarded on the old value
    const upd = await db
      .update(sensusProfiles)
      .set({ studentCardUrl: newUrl })
      .where(and(eq(sensusProfiles.id, r.id), eq(sensusProfiles.studentCardUrl, oldUrl)))
      .returning({ id: sensusProfiles.id });
    if (upd.length !== 1) {
      console.log(`  ⚠ [${r.id}] row changed under us (re-upload?) — private copy made, DB left alone`);
      failed++;
      continue;
    }
    remap.set(oldUrl, newUrl);
    migrated++;
  }

  console.log(`\nsensus_profiles: ${migrated} ${APPLY ? "migrated" : "to migrate"}, ${skippedAlready} already on proxy, ${failed} left as-is`);

  // --- event_registrations snapshots that point at a migrated sensus blob ---
  const regs = await db
    .select({ id: eventRegistrations.id, bj: eventRegistrations.biodataJson })
    .from(eventRegistrations);
  let regHits = 0;
  for (const reg of regs) {
    const bj = reg.bj as { studentProofUrl?: string } | null;
    const old = bj?.studentProofUrl;
    if (!old || !remap.has(old)) continue;
    const next = remap.get(old)!;
    regHits++;
    console.log(`  ${APPLY ? "→" : "would"} [reg ${reg.id}] biodataJson.studentProofUrl -> ${next}`);
    if (!APPLY) continue;
    const upd = await db
      .update(eventRegistrations)
      .set({ biodataJson: sql`jsonb_set(${eventRegistrations.biodataJson}, '{studentProofUrl}', ${JSON.stringify(next)}::jsonb, false)` })
      .where(
        and(
          eq(eventRegistrations.id, reg.id),
          sql`${eventRegistrations.biodataJson} ->> 'studentProofUrl' = ${old}`,
        ),
      )
      .returning({ id: eventRegistrations.id });
    if (upd.length !== 1) console.log(`  ⚠ [reg ${reg.id}] snapshot changed under us — left alone`);
  }
  console.log(`event_registrations snapshots ${APPLY ? "updated" : "to update"}: ${regHits}`);

  console.log(
    APPLY
      ? "\nDONE. Old public blobs kept (backup). Run with --verify, then eyeball a card in /console/sensus before any cleanup."
      : "\nDRY RUN complete — no writes. Re-run with --apply after PR #24 is on production.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
