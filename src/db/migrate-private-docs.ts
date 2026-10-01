/**
 * ONE-OFF, NOT part of `npm run db:seed`. Run manually AFTER the PR that adds
 * `/api/files/[...pathname]` ("dokumen pribadi ke store Blob private") is
 * deployed to production - the proxy path this script writes into the DB does
 * not exist before that.
 *
 * Moves personal documents that were uploaded to the PUBLIC Blob store (anyone
 * with the unguessable URL could open them) into the PRIVATE store, at the SAME
 * pathname, and repoints every DB reference to the auth-gated proxy
 * `/api/files/<folder>/...` (src/lib/private-files.ts).
 *
 * Folders: payment-proof, event-doc, borrow-doc, membership, resume.
 * DB references handled (found by scanning, not by assuming):
 *   - event_registrations.payment_proof_url
 *   - event_registrations.biodata_json   (studentProofUrl, source "form")
 *   - event_registrations.answers_json   (answers to "file" questions)
 *   - job_applications.resume_url
 *   - borrow_requests.statement_url
 *   - membership_applications.responses
 * Blobs that no row references ("orphans": a replaced upload, an abandoned
 * form) are copied too, so nothing personal stays public; they just get no row.
 *
 * SAFE BY DESIGN:
 *   - Dry run by default. `--apply` writes. `--limit N` migrates only the first
 *     N blobs (stage it: 2 blobs -> look at them in the console -> the rest).
 *   - Each blob is downloaded from the public store, uploaded private, then READ
 *     BACK from the private store and byte-compared (size + sha256) BEFORE any
 *     DB row is touched. A mismatch leaves the row alone.
 *   - Every UPDATE is guarded on the old value, so a row edited mid-run is
 *     skipped, not clobbered. Idempotent: a re-run skips blobs whose private
 *     copy already matches, and rows already on the proxy path.
 *   - A JSON map (old URL -> new URL -> rows) is written on every --apply, so a
 *     rollback is a plain "put the old URL back".
 *   - This script NEVER deletes anything unless you pass `--delete-public`
 *     (see below), and that mode only removes public copies whose private twin
 *     is byte-identical AND that no DB row references any more.
 *
 * Usage (from the repo root):
 *   npx tsx --env-file=.env src/db/migrate-private-docs.ts                  # dry run
 *   npx tsx --env-file=.env src/db/migrate-private-docs.ts --apply --limit 2
 *   npx tsx --env-file=.env src/db/migrate-private-docs.ts --apply          # the rest
 *   npx tsx --env-file=.env src/db/migrate-private-docs.ts --verify         # re-check, read-only
 *   npx tsx --env-file=.env src/db/migrate-private-docs.ts --delete-public --yes   # LAST step
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { del, get, list, put } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { borrowRequests, eventRegistrations, jobApplications, membershipApplications } from "./schema";
import { PRIVATE_FILE_FOLDERS, privateFileUrl } from "../lib/private-files";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const VERIFY = args.includes("--verify");
const DELETE_PUBLIC = args.includes("--delete-public");
const YES = args.includes("--yes");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const outIdx = args.indexOf("--out");
const OUT = outIdx >= 0 ? args[outIdx + 1] : `private-docs-map-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

const PUBLIC_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PRIVATE_TOKEN = process.env.PRIVATE_READ_WRITE_TOKEN;

const PUBLIC_URL_RE = /https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/[^"\s\\]+/g;
const FOLDER_SET = new Set<string>(PRIVATE_FILE_FOLDERS);

type Table = "event_registrations" | "job_applications" | "borrow_requests" | "membership_applications";
type Ref = { table: Table; id: string; column: string; kind: "text" | "json" };

function pathnameOf(publicUrl: string): string | null {
  const m = publicUrl.match(/^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\/([^?#]+)/i);
  if (!m) return null;
  const pathname = m[1].split("/").map(decodeURIComponent).join("/");
  return FOLDER_SET.has(pathname.split("/")[0]) ? pathname : null;
}

/** Every DB reference to a PUBLIC blob URL in one of the personal-document folders. */
async function collectRefs(): Promise<Map<string, Ref[]>> {
  const refs = new Map<string, Ref[]>();
  const add = (url: string, ref: Ref) => {
    if (!pathnameOf(url)) return;
    const list = refs.get(url) ?? [];
    list.push(ref);
    refs.set(url, list);
  };
  const addJson = (value: unknown, ref: Ref) => {
    for (const url of JSON.stringify(value ?? null).match(PUBLIC_URL_RE) ?? []) add(url, ref);
  };

  for (const r of await db
    .select({
      id: eventRegistrations.id,
      proof: eventRegistrations.paymentProofUrl,
      bio: eventRegistrations.biodataJson,
      answers: eventRegistrations.answersJson,
    })
    .from(eventRegistrations)) {
    if (r.proof) add(r.proof, { table: "event_registrations", id: r.id, column: "payment_proof_url", kind: "text" });
    addJson(r.bio, { table: "event_registrations", id: r.id, column: "biodata_json", kind: "json" });
    addJson(r.answers, { table: "event_registrations", id: r.id, column: "answers_json", kind: "json" });
  }
  for (const r of await db
    .select({ id: jobApplications.id, url: jobApplications.resumeUrl })
    .from(jobApplications)) {
    if (r.url) add(r.url, { table: "job_applications", id: r.id, column: "resume_url", kind: "text" });
  }
  for (const r of await db
    .select({ id: borrowRequests.id, url: borrowRequests.statementUrl })
    .from(borrowRequests)) {
    if (r.url) add(r.url, { table: "borrow_requests", id: r.id, column: "statement_url", kind: "text" });
  }
  for (const r of await db
    .select({ id: membershipApplications.id, resp: membershipApplications.responses })
    .from(membershipApplications)) {
    addJson(r.resp, { table: "membership_applications", id: r.id, column: "responses", kind: "json" });
  }
  return refs;
}

type PublicBlob = { url: string; pathname: string; size: number };

async function listPublicBlobs(): Promise<PublicBlob[]> {
  const out: PublicBlob[] = [];
  for (const folder of PRIVATE_FILE_FOLDERS) {
    let cursor: string | undefined;
    do {
      const res = await list({ prefix: `${folder}/`, cursor, limit: 1000, token: PUBLIC_TOKEN });
      for (const b of res.blobs) out.push({ url: b.url, pathname: b.pathname, size: b.size });
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
  }
  return out;
}

async function readPrivate(pathname: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    const r = await get(pathname, { access: "private", token: PRIVATE_TOKEN });
    if (!r?.stream) return null;
    const bytes = Buffer.from(await new Response(r.stream).arrayBuffer());
    return { bytes, contentType: r.blob.contentType };
  } catch {
    return null;
  }
}

const sha = (b: Buffer | ArrayBuffer) => createHash("sha256").update(Buffer.from(b as ArrayBuffer)).digest("hex");

/** Repoint one DB reference, guarded on the old value. Returns rows changed. */
async function repoint(ref: Ref, oldUrl: string, newUrl: string): Promise<number> {
  const table = sql.raw(`"${ref.table}"`);
  const col = sql.raw(`"${ref.column}"`);
  const res =
    ref.kind === "text"
      ? await db.execute(sql`update ${table} set ${col} = ${newUrl} where id = ${ref.id} and ${col} = ${oldUrl} returning id`)
      : await db.execute(
          sql`update ${table} set ${col} = replace(${col}::text, ${`"${oldUrl}"`}, ${`"${newUrl}"`})::jsonb
              where id = ${ref.id} and strpos(${col}::text, ${`"${oldUrl}"`}) > 0 returning id`,
        );
  return (res as unknown as { rows?: unknown[] }).rows?.length ?? (Array.isArray(res) ? res.length : 0);
}

async function migrate() {
  const refs = await collectRefs();
  const blobs = await listPublicBlobs();
  console.log(`public blobs in personal-document folders: ${blobs.length}`);
  console.log(`DB references to them: ${[...refs.values()].reduce((n, r) => n + r.length, 0)} (${refs.size} distinct URLs)`);
  const orphanCount = blobs.filter((b) => !refs.has(b.url)).length;
  console.log(`blobs with no DB row (orphans, copied only): ${orphanCount}`);
  const unknownRefs = [...refs.keys()].filter((u) => !blobs.some((b) => b.url === u));
  if (unknownRefs.length) {
    console.log(`WARNING ${unknownRefs.length} DB URL(s) point at blobs not in the listing (deleted already?):`);
    for (const u of unknownRefs) console.log(`   ${u}`);
  }
  console.log(`mode: ${APPLY ? "APPLY (writing!)" : "DRY RUN (no writes)"}${Number.isFinite(LIMIT) ? `, limit ${LIMIT}` : ""}\n`);

  const map: { oldUrl: string; newUrl: string; pathname: string; size: number; sha256: string; rows: Ref[] }[] = [];
  let copied = 0, alreadyCopied = 0, rowsRepointed = 0, failed = 0;
  let handled = 0;

  for (const b of blobs) {
    if (handled >= LIMIT) break;
    handled++;
    const rows = refs.get(b.url) ?? [];
    const newUrl = privateFileUrl(b.pathname);
    const tag = `${b.pathname} (${(b.size / 1024).toFixed(0)} KB, ${rows.length} row${rows.length === 1 ? "" : "s"})`;

    if (!APPLY) {
      console.log(`  would move ${tag}`);
      continue;
    }

    // 1. download the public bytes
    let bytes: Buffer;
    let contentType: string;
    try {
      const res = await fetch(b.url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
      contentType = res.headers.get("content-type") || "application/octet-stream";
      if (bytes.byteLength !== b.size) throw new Error(`size ${bytes.byteLength} != listed ${b.size}`);
    } catch (e) {
      console.log(`  ✗ ${tag}: cannot read public blob (${(e as Error).message}) - left alone`);
      failed++;
      continue;
    }
    const digest = sha(bytes);

    // 2. private copy (skip the upload if an identical one is already there)
    const existing = await readPrivate(b.pathname);
    if (existing && sha(existing.bytes) === digest) {
      alreadyCopied++;
    } else {
      try {
        const up = await put(b.pathname, bytes, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType,
          token: PRIVATE_TOKEN,
        });
        if (up.pathname !== b.pathname) throw new Error(`pathname drift ${up.pathname}`);
      } catch (e) {
        console.log(`  ✗ ${tag}: private put failed (${(e as Error).message}) - left alone`);
        failed++;
        continue;
      }
      // 3. read it back and compare byte for byte
      const back = await readPrivate(b.pathname);
      if (!back || back.bytes.byteLength !== bytes.byteLength || sha(back.bytes) !== digest) {
        console.log(`  ✗ ${tag}: private readback mismatch - DB NOT touched`);
        failed++;
        continue;
      }
      copied++;
    }

    // 4. repoint the rows, each guarded on the old value
    let changed = 0;
    for (const ref of rows) {
      const n = await repoint(ref, b.url, newUrl);
      if (n === 1) changed++;
      else console.log(`  ⚠ ${ref.table}.${ref.column} [${ref.id}] changed under us - left alone`);
    }
    rowsRepointed += changed;
    map.push({ oldUrl: b.url, newUrl, pathname: b.pathname, size: b.size, sha256: digest, rows });
    console.log(`  → ${tag}${changed ? `, ${changed} row(s) repointed` : ""}`);
  }

  if (APPLY) {
    writeFileSync(OUT, JSON.stringify(map, null, 2));
    console.log(`\nmap written to ${OUT} (keep it: old URL <-> new URL, for rollback)`);
  }
  console.log(
    `\n${APPLY ? "DONE" : "DRY RUN"}: ${blobs.length > handled ? `${handled} of ${blobs.length}` : blobs.length} blobs, ` +
      `${copied} copied, ${alreadyCopied} already private, ${rowsRepointed} rows repointed, ${failed} failed.` +
      (APPLY ? "\nPublic copies were NOT deleted. Run --verify, check a few files in the console, then --delete-public." : ""),
  );
  if (failed > 0) process.exitCode = 1;
}

async function verify() {
  const refs = await collectRefs();
  console.log(`DB rows still pointing at a PUBLIC blob URL: ${[...refs.values()].reduce((n, r) => n + r.length, 0)}`);
  for (const [url, rows] of refs) console.log(`  ✗ ${url} <- ${rows.map((r) => `${r.table}.${r.column}`).join(", ")}`);

  // every proxy reference in the DB must be readable from the private store
  const proxyUrls = new Set<string>();
  const PROXY_RE = /\/api\/files\/[A-Za-z0-9._\/-]+/g;
  const scan = (v: unknown) => {
    for (const m of JSON.stringify(v ?? null).match(PROXY_RE) ?? []) proxyUrls.add(m);
  };
  for (const r of await db.select().from(eventRegistrations)) scan([r.paymentProofUrl, r.biodataJson, r.answersJson]);
  for (const r of await db.select().from(jobApplications)) scan(r.resumeUrl);
  for (const r of await db.select().from(borrowRequests)) scan(r.statementUrl);
  for (const r of await db.select().from(membershipApplications)) scan(r.responses);
  let ok = 0, bad = 0;
  for (const u of proxyUrls) {
    const pathname = u.slice("/api/files/".length);
    const got = await readPrivate(pathname);
    if (got && got.bytes.byteLength > 0) ok++;
    else {
      bad++;
      console.log(`  ✗ proxy URL has no private object: ${u}`);
    }
  }
  console.log(`proxy references readable from the private store: ${ok} ok, ${bad} problems`);

  const blobs = await listPublicBlobs();
  let twin = 0, noTwin = 0;
  for (const b of blobs) {
    const got = await readPrivate(b.pathname);
    if (got && got.bytes.byteLength === b.size) twin++;
    else {
      noTwin++;
      console.log(`  ✗ public blob without an identical private twin: ${b.pathname}`);
    }
  }
  console.log(`public blobs left: ${blobs.length} (${twin} with an identical private twin, ${noTwin} without)`);
  if (bad > 0 || noTwin > 0 || refs.size > 0) process.exitCode = 1;
}

async function deletePublic() {
  const refs = await collectRefs();
  const blobs = await listPublicBlobs();
  const deletable: PublicBlob[] = [];
  for (const b of blobs) {
    if (refs.has(b.url)) {
      console.log(`  skip ${b.pathname}: a DB row still references the public URL`);
      continue;
    }
    const twin = await readPrivate(b.pathname);
    if (!twin || twin.bytes.byteLength !== b.size) {
      console.log(`  skip ${b.pathname}: no identical private twin`);
      continue;
    }
    deletable.push(b);
  }
  console.log(`\n${deletable.length} of ${blobs.length} public copies are safe to delete (private twin identical, no DB row uses the public URL).`);
  if (!YES) {
    console.log("Nothing deleted. Re-run with --delete-public --yes to delete them.");
    return;
  }
  for (let i = 0; i < deletable.length; i += 100) {
    await del(deletable.slice(i, i + 100).map((b) => b.url), { token: PUBLIC_TOKEN });
  }
  console.log(`deleted ${deletable.length} public blobs.`);
}

async function main() {
  if (!PRIVATE_TOKEN || !PUBLIC_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN and PRIVATE_READ_WRITE_TOKEN must both be set - aborting.");
    process.exit(1);
  }
  if (VERIFY) return verify();
  if (DELETE_PUBLIC) return deletePublic();
  return migrate();
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
