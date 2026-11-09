"use server";

import { inArray } from "drizzle-orm";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, roles, rantings, userRoles, departmentMembers, departments, membershipApplications, feedback, externalLoans } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { sendEmail } from "@/lib/email";
import { renderMembershipEmail, renderMembershipEmailText } from "@/lib/membership-email";
import { createResetToken, purgeExpiredResetTokens } from "@/lib/password-reset";
import { canReceivePasswordReset } from "@/lib/password-reset-rules";
import { getSiteUrl } from "@/lib/site-url";
import { suggestEmailFix } from "@/lib/email-typo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "users")) throw new Error("Forbidden");
  return { id: session!.user.id };
}

/**
 * Simpan slot role berbasis kategori (Opsi B 2026-11):
 *  - kabinetSlot   : role 'kabinet'/'advisory' ("" = kosong -> orang awam)
 *  - rantingSlot   : role 'ranting' ("BPH Ranting" / "Anggota Ranting", "" = kosong),
 *  - rantingUnitId : unit rantingnya (wajib saat rantingSlot diisi).
 * Satu orang maksimal SATU role per kategori - unik di DB dan di sini slot
 * lama dihapus dulu. users.role_id (mirror lama) tetap disalin agar eksport
 * CSV & tampilan lain yang membaca kolom itu tetap konsisten.
 */
export async function updateUserRoles(userId: string, cabinetSlot: string, rantingSlot: string, rantingUnitId: string) {
  const admin = await assertAdmin();

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw new Error("Pengguna tidak ditemukan.");

  const allRoles = await db.select({ id: roles.id, category: roles.category, name: roles.name }).from(roles);
  const cabinetRole = cabinetSlot ? allRoles.find((r) => r.id === cabinetSlot && (r.category === "kabinet" || r.category === "advisory")) : undefined;
  const rantingRole = rantingSlot ? allRoles.find((r) => r.id === rantingSlot && r.category === "ranting") : undefined;
  if (cabinetSlot && !cabinetRole) throw new Error("Role kabinet yang dipilih tidak berlaku.");
  if (rantingSlot && !rantingRole) throw new Error("Role ranting yang dipilih tidak berlaku.");

  let unitId: string | null = null;
  if (rantingRole) {
    const [unit] = await db
      .select({ id: rantings.id })
      .from(rantings)
      // Role ranting tanpa unit tidak boleh ada (CDC user_roles).
      .where(and(eq(rantings.id, rantingUnitId), eq(rantings.isActive, true)));
    if (!unit) throw new Error("Pilih unit ranting untuk role ranting ini.");
    unitId = unit.id;
  }

  await db.transaction(async (tx) => {
    // Slot kategori kabinet/advisory: satu slot UI mencakup dua kategori itu,
    // jadi keduanya dibersihkan (mencegah Ketua Umum + Dewan Pembina bersamaan).
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), inArray(userRoles.roleCategory, ["kabinet", "advisory"])));
    if (cabinetRole) {
      await tx.insert(userRoles).values({
        userId,
        roleId: cabinetRole.id,
        roleCategory: cabinetRole.category,
        assignedBy: admin.id,
      });
    }
    await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleCategory, "ranting")));
    if (rantingRole && unitId) {
      await tx.insert(userRoles).values({
        userId,
        roleId: rantingRole.id,
        roleCategory: "ranting",
        rantingId: unitId,
        assignedBy: admin.id,
      });
    }
    // Mirror slot kabinet ke kolom lama (eksport CSV & display).
    await tx.update(users).set({ roleId: cabinetRole?.id ?? null }).where(eq(users.id, userId));
  });

  revalidatePath("/console/users");
  revalidatePath("/console/organization");
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
  // Hanya saat email DIGANTI: mengubah nama akun yang emailnya sudah terlanjur
  // salah ketik (mis. gmail.con) tidak boleh ikut tertahan oleh cek ini.
  const [current] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId));
  const emailFix = current?.email.toLowerCase() === e ? null : suggestEmailFix(e);
  if (emailFix) throw new Error(`Email sepertinya salah ketik. Maksud Anda ${emailFix}?`);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, e));
  if (existing && existing.id !== userId) throw new Error("Email sudah digunakan oleh akun lain");
  await db.update(users).set({ name: n, email: e }).where(eq(users.id, userId));
  revalidatePath("/console/users");
}

/**
 * Admin memicu email reset password ATAS NAMA pengguna lain - untuk kasus
 * mereka gagal login berulang dan tidak menyadari/menemukan link "Lupa
 * password?" di /login sendiri (lihat requestPasswordReset di actions/auth.ts,
 * jalur self-service yang sudah ada). Sengaja TANPA cooldown - beda dari jalur
 * publik itu, aksi ini sudah di balik login admin + per-pengguna eksplisit,
 * jadi tidak butuh pengaman anti-enumerasi/anti-spam yang sama.
 */
export async function sendPasswordResetLink(userId: string): Promise<void> {
  await assertAdmin();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) throw new Error("Pengguna tidak ditemukan.");
  // Tombolnya sendiri sudah disembunyikan untuk baris yang tidak berhak, ini
  // jaga-jaga kalau fungsinya dipanggil lewat jalur lain. Akun Google-only yang
  // emailnya terverifikasi justru boleh: tautan ini satu-satunya cara mereka
  // memasang kata sandi.
  if (!canReceivePasswordReset(user)) {
    throw new Error("Akun ini belum punya kata sandi dan emailnya belum terverifikasi.");
  }

  await purgeExpiredResetTokens();
  const token = await createResetToken(user.id);
  const link = `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const heading = "Reset password akun PPIT Nanjing";
  const body = [
    `Halo ${user.name ?? "Anggota"},`,
    "Admin PPIT Nanjing mengirimkan tautan ini karena kamu mengalami kendala masuk ke akun. Klik tombol di bawah untuk membuat password baru. Tautan ini berlaku 1 jam.",
    "Kalau kamu merasa tidak butuh ini, abaikan saja. Password kamu tidak berubah sampai tautan ini dibuka.",
  ].join("\n\n");
  const res = await sendEmail({
    to: user.email,
    subject: heading,
    html: renderMembershipEmail({
      heading,
      body,
      ctaLabel: "Buat password baru",
      ctaUrl: link,
      footerNote: "Email ini dikirim otomatis oleh sistem akun PPIT Nanjing. Jangan teruskan tautan di atas ke siapa pun.",
    }),
    text: renderMembershipEmailText({ heading, body, ctaLabel: "Buat password baru", ctaUrl: link }),
  });
  if (!res.ok) throw new Error(`Gagal mengirim email: ${res.reason}`);
}

export async function deleteUser(userId: string) {
  await assertAdmin();
  const session = await auth();
  if (session?.user?.id === userId) throw new Error("Tidak bisa menghapus akun sendiri");
  // Clear references first - membership_applications.userId, feedback.userId,
  // departments.headUserId and external_loans.recordedBy have no ON DELETE
  // cascade, so leaving them would fail.
  await db.update(departments).set({ headUserId: null }).where(eq(departments.headUserId, userId));
  await db.update(membershipApplications).set({ userId: null }).where(eq(membershipApplications.userId, userId));
  await db.update(feedback).set({ userId: null }).where(eq(feedback.userId, userId));
  await db.update(externalLoans).set({ recordedBy: null }).where(eq(externalLoans.recordedBy, userId));
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
