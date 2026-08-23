import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { departments, driveFolders, managementPeriods } from "@/db/schema";
import { createFolder } from "@/lib/drive";

// Resolve (and lazily create) the Google Drive folder backing a (period,
// division) pair. departmentId === null -> the period-level folder directly
// under the configured root. Returns the Drive folder id.
export async function resolveDriveFolder(params: {
  periodId: string;
  departmentId: string | null;
}): Promise<string> {
  const { periodId, departmentId } = params;

  const [existing] = await db
    .select({ driveFolderId: driveFolders.driveFolderId })
    .from(driveFolders)
    .where(
      departmentId
        ? and(eq(driveFolders.managementPeriodId, periodId), eq(driveFolders.departmentId, departmentId))
        : and(eq(driveFolders.managementPeriodId, periodId), isNull(driveFolders.departmentId)),
    )
    .limit(1);

  if (existing) return existing.driveFolderId;

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
    parentId = await resolveDriveFolder({ periodId, departmentId: null });
    name = dept.name;
  } else {
    parentId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    name = period.label;
  }

  const folder = await createFolder(name, parentId);
  await db.insert(driveFolders).values({
    managementPeriodId: periodId,
    departmentId: departmentId ?? null,
    name,
    driveFolderId: folder.id,
    parentDriveFolderId: parentId,
  });
  return folder.id;
}
