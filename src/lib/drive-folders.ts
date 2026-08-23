import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { departments, driveFolders, managementPeriods } from "@/db/schema";
import { createFolder, trashFile } from "@/lib/drive";

// Key used for the in-memory preload map: departmentId, or "" for the
// period-level (departmentId IS NULL) folder.
function preloadKey(departmentId: string | null): string {
  return departmentId ?? "";
}

// Fetch every (period, division) -> Drive folder mapping already recorded
// for a period in one query, so callers looping over many departments for
// the same period (e.g. the member documents page) don't run resolveDriveFolder's
// select once per department.
export async function preloadDriveFolders(periodId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ departmentId: driveFolders.departmentId, driveFolderId: driveFolders.driveFolderId })
    .from(driveFolders)
    .where(eq(driveFolders.managementPeriodId, periodId));
  return new Map(rows.map((r) => [preloadKey(r.departmentId), r.driveFolderId]));
}

async function selectExisting(periodId: string, departmentId: string | null): Promise<string | null> {
  const [existing] = await db
    .select({ driveFolderId: driveFolders.driveFolderId })
    .from(driveFolders)
    .where(
      departmentId
        ? and(eq(driveFolders.managementPeriodId, periodId), eq(driveFolders.departmentId, departmentId))
        : and(eq(driveFolders.managementPeriodId, periodId), isNull(driveFolders.departmentId)),
    )
    .limit(1);
  return existing?.driveFolderId ?? null;
}

// Resolve (and lazily create) the Google Drive folder backing a (period,
// division) pair. departmentId === null -> the period-level folder directly
// under the configured root. Returns the Drive folder id.
//
// `preloaded`, when passed, is consulted before hitting the DB - see
// preloadDriveFolders(). It's only a cache for the read path; folder
// creation below still re-checks the DB immediately before inserting to
// guard against a concurrent creator (see the catch block).
export async function resolveDriveFolder(params: {
  periodId: string;
  departmentId: string | null;
  preloaded?: Map<string, string>;
}): Promise<string> {
  const { periodId, departmentId, preloaded } = params;

  const preloadedId = preloaded?.get(preloadKey(departmentId));
  if (preloadedId) return preloadedId;

  const existing = await selectExisting(periodId, departmentId);
  if (existing) return existing;

  const [period] = await db
    .select({ label: managementPeriods.label })
    .from(managementPeriods)
    .where(eq(managementPeriods.id, periodId))
    .limit(1);
  if (!period) throw new Error("Periode tidak ditemukan");

  let parentId: string;
  let name: string;

  if (departmentId) {
    const [dept] = await db
      .select({ name: departments.name })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);
    if (!dept) throw new Error("Divisi tidak ditemukan");
    parentId = await resolveDriveFolder({ periodId, departmentId: null, preloaded });
    name = dept.name;
  } else {
    parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    name = period.label;
  }

  const folder = await createFolder(name, parentId);

  // Two concurrent first-time requests for the same (period, division) can
  // both pass the selectExisting() check above and both create a Drive
  // folder; onConflictDoNothing lets the DB's partial unique index (see
  // schema.ts) decide which insert wins atomically instead of a
  // check-then-insert race. Each partial index needs its own conflict
  // target/predicate pair - Postgres can't infer which partial index is the
  // arbiter from the columns alone.
  const [inserted] = await db
    .insert(driveFolders)
    .values({
      managementPeriodId: periodId,
      departmentId: departmentId ?? null,
      name,
      driveFolderId: folder.id,
      parentDriveFolderId: parentId,
    })
    .onConflictDoNothing({
      target: departmentId ? [driveFolders.managementPeriodId, driveFolders.departmentId] : [driveFolders.managementPeriodId],
      where: departmentId ? sql`${driveFolders.departmentId} is not null` : sql`${driveFolders.departmentId} is null`,
    })
    .returning({ driveFolderId: driveFolders.driveFolderId });

  if (inserted) return inserted.driveFolderId;

  // We lost the race: someone else's row is now the source of truth, so the
  // Drive folder created above is a duplicate - clean it up rather than
  // leaving it as a permanent orphan, then defer to the winner.
  await trashFile(folder.id).catch(() => {});
  const winner = await selectExisting(periodId, departmentId);
  if (winner) return winner;
  throw new Error("Gagal membuat folder Drive: tidak ada baris yang tersimpan setelah konflik.");
}
