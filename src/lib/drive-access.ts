import { eq } from "drizzle-orm";
import { db } from "@/db";
import { departmentMembers, managementPeriods } from "@/db/schema";

export type FolderAccess = "write" | "read" | "none";

// Akses ke folder Drive berdasarkan peran di website (bukan permission Google):
// - admin penuh ("full")            : write semua folder
// - anggota periode aktif, divisi sama  : write folder divisinya
// - anggota periode aktif, divisi lain  : read-only
// - folder periode lain / bukan anggota : none
// - folder level periode (departmentId null) hanya bisa di-write admin
export async function folderAccess(params: {
  userId: string | undefined;
  adminScope: "full" | string[] | null;
  periodId: string;
  departmentId: string | null;
}): Promise<FolderAccess> {
  if (params.adminScope === "full") return "write";
  if (!params.userId) return "none";

  const [current] = await db
    .select({ id: managementPeriods.id })
    .from(managementPeriods)
    .where(eq(managementPeriods.isCurrent, true))
    .limit(1);
  if (!current) return "none";
  if (current.id !== params.periodId) return "none";

  const rows = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, params.userId));
  const myDepts = new Set(rows.map((r) => r.departmentId));

  if (params.departmentId && myDepts.has(params.departmentId)) return "write";
  return "read";
}

export async function getCurrentPeriodId(): Promise<string | null> {
  const [current] = await db
    .select({ id: managementPeriods.id })
    .from(managementPeriods)
    .where(eq(managementPeriods.isCurrent, true))
    .limit(1);
  return current?.id ?? null;
}
