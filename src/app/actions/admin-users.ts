"use server";

import { and, eq, ne } from "drizzle-orm";
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
  // updateDepartment (admin-departments.ts) only lets headUserId be set to a
  // CURRENT member, but this is the action that actually moves someone out
  // of a department - without this, reassigning a department's head to a
  // different division would silently leave departments.headUserId pointing
  // at someone who's no longer a member there.
  await db
    .update(departments)
    .set({ headUserId: null })
    .where(
      departmentId
        ? and(eq(departments.headUserId, userId), ne(departments.id, departmentId))
        : eq(departments.headUserId, userId),
    );
  revalidatePath("/console/users");
  revalidatePath("/console/organization");
}

export async function updateUserStatus(userId: string, status: "invited" | "active" | "inactive" | "suspended") {
  await assertAdmin();
  await db.update(users).set({ status }).where(eq(users.id, userId));
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

/**
 * Membuat akun berstatus "invited" secara massal dari daftar tempel.
 *
 * KENAPA INI ADA: seluruh sisi "klaim" sudah terbangun sejak lama — `src/auth.ts`
 * menautkan sign-in Google ke baris ber-status "invited", dan `signUpWithPassword`
 * mengklaimnya lewat jalur email/password. Tapi TIDAK ADA yang bisa membuat baris
 * itu, jadi kedua jalur tersebut tidak pernah bisa dijangkau. Ini bagian yang
 * hilang.
 *
 * Massal, bukan satu-satu, karena bentuk kebutuhannya memang begitu: satu
 * kepanitiaan acara bisa berisi 30 orang yang belum punya akun, dan mereka harus
 * ada lebih dulu sebelum bisa ditugaskan ke divisi atau diberi sertifikat.
 *
 * Format tiap baris: "Nama, email@contoh.com" — atau email saja.
 */
export async function inviteUsers(formData: FormData): Promise<void> {
  await assertAdmin();
  const raw = String(formData.get("bulk") ?? "");

  const parsed: { name: string | null; email: string }[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Pemisah terakhir yang dipakai, supaya nama yang mengandung koma
    // ("Tan, Vennesia") tidak terpotong di tempat yang salah.
    const cut = trimmed.lastIndexOf(",");
    const name = cut > 0 ? trimmed.slice(0, cut).trim() : null;
    const email = (cut > 0 ? trimmed.slice(cut + 1) : trimmed).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    parsed.push({ name: name || null, email });
  }
  if (parsed.length === 0) return;

  // Akun yang sudah ada DILEWATI, tidak ditimpa: menimpanya bisa menurunkan
  // orang yang sudah aktif kembali jadi "invited" dan memutus loginnya.
  // onConflictDoNothing menyerahkan penilaiannya ke constraint unique(email),
  // jadi tidak ada jendela balapan antara memeriksa dan menyisipkan.
  await db
    .insert(users)
    .values(parsed.map((p) => ({ email: p.email, name: p.name, status: "invited" as const })))
    .onConflictDoNothing({ target: users.email });

  revalidatePath("/console/users");
}
