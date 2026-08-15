"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, departmentMembers } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

async function assertAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "users")) throw new Error("Forbidden");
}

export async function updateUserRole(userId: string, roleId: string) {
  await assertAdmin();
  await db
    .update(users)
    .set({ roleId: roleId || null })
    .where(eq(users.id, userId));
  revalidatePath("/console/users");
}

export async function assignUserDepartment(userId: string, departmentId: string, position: string) {
  await assertAdmin();
  await db.delete(departmentMembers).where(eq(departmentMembers.userId, userId));
  if (departmentId) {
    await db.insert(departmentMembers).values({ userId, departmentId, position: position || null });
  }
  revalidatePath("/console/users");
}

export async function updateUserStatus(userId: string, status: "active" | "inactive" | "suspended") {
  await assertAdmin();
  await db.update(users).set({ status }).where(eq(users.id, userId));
  revalidatePath("/console/users");
}
