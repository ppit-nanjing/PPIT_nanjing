"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, departmentMembers, departments, membershipApplications, feedback } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function updateUserStatus(userId: string, status: "invited" | "active" | "inactive" | "suspended") {
  await assertAdmin();
  await db.update(users).set({ status }).where(eq(users.id, userId));
  revalidatePath("/console/users");
}

// Admin pre-provisions an account ("invited"): no passwordHash yet, so the
// person can't sign in until they claim it via Google (signIn callback links
// the OAuth identity) or via /signup with this exact email (signUpWithPassword
// claims the row). Role/department can be set up front so admin access is live
// the moment they first sign in.
export async function createInvitedUser(formData: FormData) {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("roleId") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();

  if (!name || !EMAIL_RE.test(email)) throw new Error("Nama dan email wajib diisi dengan benar");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new Error("Email sudah digunakan oleh akun lain");

  const [row] = await db
    .insert(users)
    .values({ name, email, status: "invited", roleId: roleId || null })
    .returning();

  if (departmentId) {
    await db.insert(departmentMembers).values({ userId: row.id, departmentId, position: position || null });
  }
  revalidatePath("/console/users");
}

export async function updateUserDetails(userId: string, name: string, email: string) {
  await assertAdmin();
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (!n || !EMAIL_RE.test(e)) throw new Error("Nama dan email wajib diisi dengan benar");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, e));
  if (existing && existing.id !== userId) throw new Error("Email sudah digunakan oleh akun lain");
  await db.update(users).set({ name: n, email: e }).where(eq(users.id, userId));
  revalidatePath("/console/users");
}

export async function deleteUser(userId: string) {
  await assertAdmin();
  const session = await auth();
  if (session?.user?.id === userId) throw new Error("Tidak bisa menghapus akun sendiri");
  // Clear references first - membership_applications.userId, feedback.userId and
  // departments.headUserId have no ON DELETE cascade, so leaving them would fail.
  await db.update(departments).set({ headUserId: null }).where(eq(departments.headUserId, userId));
  await db.update(membershipApplications).set({ userId: null }).where(eq(membershipApplications.userId, userId));
  await db.update(feedback).set({ userId: null }).where(eq(feedback.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/console/users");
}
