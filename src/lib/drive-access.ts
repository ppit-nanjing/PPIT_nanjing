import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { departmentMembers, managementPeriods } from "@/db/schema";

export type FolderAccess = "write" | "read" | "none";

// Wrapped in React's cache() so repeated calls within the same request (e.g.
// the member documents page checking every department) hit the DB once
// instead of once per call - a request-scoped memoization, not a
// caller-suppliable value. A caller-suppliable "trust me, this is the
// current period" hint used to live here instead and was a live bug: a
// caller checking folderAccess for a periodId it already believed was
// current could pass that same value back in as the hint, making the
// "period must actually be current" comparison tautological. cache() gets
// the same perf win with no such shortcut to misuse.
export const getCurrentPeriodId = cache(async (): Promise<string | null> => {
  const [current] = await db
    .select({ id: managementPeriods.id })
    .from(managementPeriods)
    .where(eq(managementPeriods.isCurrent, true))
    .limit(1);
  return current?.id ?? null;
});

export const getUserDepartmentIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, userId));
  return rows.map((r) => r.departmentId);
});

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

  const currentId = await getCurrentPeriodId();
  if (!currentId) return "none";
  if (currentId !== params.periodId) return "none";

  const myDepts = new Set(await getUserDepartmentIds(params.userId));

  if (params.departmentId && myDepts.has(params.departmentId)) return "write";
  return "read";
}
