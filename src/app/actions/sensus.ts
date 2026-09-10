"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireModuleAccess } from "@/lib/admin-scope";
import { db } from "@/db";
import { auditLogs, sensusProfiles } from "@/db/schema";
import { validateSensus, type SensusInput, type SensusIssue } from "@/lib/sensus-form";

// Tipe & aturan validasinya ada di src/lib/sensus-form.ts — berkas "use server"
// hanya boleh mengekspor fungsi async, jadi tipe dan konstanta tidak bisa
// tinggal di sini; pemakainya mengimpor langsung dari lib itu.

function toValues(input: SensusInput) {
  return {
    fullName: input.fullName || null,
    mandarinName: input.mandarinName || null,
    passportNumber: input.passportNumber || null,
    gender: input.gender || null,
    passportExpiry: input.passportExpiry || null,
    province: input.province || null,
    birthDate: input.birthDate || null,
    branch: input.branch || null,
    studentStatus: input.studentStatus || null,
    university: input.university || null,
    degreeLevel: input.degreeLevel || null,
    major: input.major || null,
    mediumOfInstruction: input.mediumOfInstruction || null,
    mandarinAbility: input.mandarinAbility || null,
    fundingSource: input.fundingSource || null,
    entryYear: input.entryYear ? Number(input.entryYear) : null,
    graduationYear: input.graduationYear ? Number(input.graduationYear) : null,
    activeEmail: input.activeEmail || null,
    wechatId: input.wechatId || null,
    phoneActive: input.phoneActive || null,
    whatsappNumber: input.whatsappNumber || null,
    emergencyContact: input.emergencyContact || null,
    chinaAddress: input.chinaAddress || null,
    studentCardUrl: input.studentCardUrl || null,
    agreeTerms: Boolean(input.agreeTerms),
    subscribeNewsletter: Boolean(input.subscribeNewsletter),
  };
}

// Satu orang bisa punya dua akun Google (pribadi + kampus). Kalau keduanya
// mengisi sensus dengan paspor yang sama, orang itu terhitung dua anggota di
// sini dan terkirim dobel ke pusat.
//
// Sengaja TIDAK memindahkan profil lama ke akun baru secara otomatis: nomor
// paspor di sini adalah klaim identitas yang belum diverifikasi siapa pun, jadi
// pemindahan otomatis berarti siapa saja yang tahu nomor paspor orang lain bisa
// mengambil alih baris sensusnya. Kembar ditolak, penyelesaiannya lewat
// pengurus (hapus akun yang tidak dipakai di /console/users — sensus_profiles
// ikut terhapus lewat cascade).
async function passportTakenByAnotherUser(userId: string, passportNumber: string): Promise<boolean> {
  const value = passportNumber.trim();
  if (!value) return false;
  const [clash] = await db
    .select({ id: sensusProfiles.id })
    .from(sensusProfiles)
    .where(and(eq(sensusProfiles.passportNumber, value), ne(sensusProfiles.userId, userId)))
    .limit(1);
  return Boolean(clash);
}

export async function submitSensusProfile(
  returnTo: string | null,
  input: SensusInput
): Promise<{ issues: SensusIssue[] } | undefined> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Data sensus dipakai untuk rekap ke PPI Tiongkok pusat, dan di sana SEMUA
  // field ini wajib — profil yang bolong tidak bisa dimasukkan ke sistem
  // mereka. Jadi kelengkapannya ditegakkan di server, bukan cuma di wizard
  // (`completionStatus: "complete"` harus benar-benar berarti lengkap).
  const issues = validateSensus(input);
  if (await passportTakenByAnotherUser(session.user.id, input.passportNumber)) {
    issues.push({ field: "passportNumber", step: 0, kind: "passportTaken" });
  }
  if (issues.length > 0) return { issues };

  const values = { ...toValues(input), completionStatus: "complete" as const, updatedAt: new Date() };

  await db
    .insert(sensusProfiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: sensusProfiles.userId, set: values });

  // Only redirect to a same-origin path - returnTo comes from a query param, so
  // treat it as untrusted input (open-redirect guard).
  redirect(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/sensus/success");
}

// Saves progress as the user moves between wizard steps, without redirecting -
// implements the "simpan progres per-langkah" note in docs/Sensus Profile Flow.md
// so an incomplete session isn't lost. Never downgrades an already-complete
// profile back to incomplete; only the final submit sets completion_status.
export async function saveSensusStep(input: SensusInput): Promise<{ savedAt: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthenticated" };

  // Dicegat sebelum menyentuh database: tanpa ini, unique constraint pada
  // passport_number melempar error mentah di tengah wizard. Ditolak sejak
  // langkah Biodata juga berarti pengisi tahu lebih awal, bukan setelah
  // menghabiskan tiga langkah.
  if (await passportTakenByAnotherUser(session.user.id, input.passportNumber)) {
    return { error: "passport_taken" };
  }

  const [existing] = await db
    .select({ completionStatus: sensusProfiles.completionStatus })
    .from(sensusProfiles)
    .where(eq(sensusProfiles.userId, session.user.id));

  const values = {
    ...toValues(input),
    completionStatus: existing?.completionStatus === "complete" ? ("complete" as const) : ("incomplete" as const),
    updatedAt: new Date(),
  };

  await db
    .insert(sensusProfiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: sensusProfiles.userId, set: values });

  return { savedAt: values.updatedAt.toISOString() };
}

// ---------- Onboarding / first-login partial census save ----------
// Menyimpan sebagian field dari modal onboarding supaya baris sensus sudah ada
// dan bisa dilanjutkan dari /sensus. MERGE, bukan replace: hanya field yang
// benar-benar diisi yang ditulis — tidak pernah mengosongkan progres /sensus
// yang mungkin sudah ada. Tidak menyentuh completionStatus (baris baru =
// "incomplete" lewat default kolom; baris lama biarkan apa adanya).
const ONBOARDING_SENSUS_FIELDS = [
  "fullName",
  "branch",
  "activeEmail",
  "wechatId",
  "whatsappNumber",
] as const satisfies readonly (keyof SensusInput)[];

export async function saveOnboardingSensus(
  input: Partial<SensusInput>
): Promise<{ savedAt: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthenticated" };

  const patch: Partial<Record<(typeof ONBOARDING_SENSUS_FIELDS)[number], string>> = {};
  for (const field of ONBOARDING_SENSUS_FIELDS) {
    const value = String(input[field] ?? "").trim();
    if (value) patch[field] = value;
  }
  const now = new Date();
  if (Object.keys(patch).length === 0) return { savedAt: now.toISOString() };

  const [existing] = await db
    .select({ id: sensusProfiles.id })
    .from(sensusProfiles)
    .where(eq(sensusProfiles.userId, session.user.id));

  if (existing) {
    await db
      .update(sensusProfiles)
      .set({ ...patch, updatedAt: now })
      .where(eq(sensusProfiles.userId, session.user.id));
  } else {
    await db
      .insert(sensusProfiles)
      .values({ userId: session.user.id, ...patch, completionStatus: "incomplete", updatedAt: now });
  }

  return { savedAt: now.toISOString() };
}

// ---------- Admin edit / delete (dari /console/sensus) ----------
// Sensus tetap milik mahasiswa (diisi lewat /sensus). Ini untuk pengurus
// pemegang modul "sensus" membetulkan typo / menghapus baris spam-duplikat.
// Setiap perubahan dicatat ke audit_logs (entity_type "sensus_profile").

const SENSUS_STRING_FIELDS = [
  "fullName", "mandarinName", "passportNumber", "gender", "passportExpiry", "province", "birthDate",
  "branch", "studentStatus", "university", "degreeLevel", "major", "mediumOfInstruction",
  "mandarinAbility", "fundingSource", "entryYear", "graduationYear", "activeEmail", "wechatId",
  "phoneActive", "whatsappNumber", "emergencyContact", "chinaAddress", "studentCardUrl",
] as const;

function formToSensusInput(formData: FormData): SensusInput {
  const input = {} as Record<string, unknown>;
  for (const f of SENSUS_STRING_FIELDS) input[f] = String(formData.get(f) ?? "").trim();
  // Kartu mahasiswa tidak diedit sebagai teks - kotak "hapus berkas" saja.
  if (formData.get("clearStudentCard") === "on") input.studentCardUrl = "";
  else input.studentCardUrl = String(formData.get("currentStudentCardUrl") ?? "");
  input.agreeTerms = formData.get("agreeTerms") === "on";
  input.subscribeNewsletter = formData.get("subscribeNewsletter") === "on";
  return input as unknown as SensusInput;
}

export async function updateSensusProfile(formData: FormData): Promise<void> {
  const session = await requireModuleAccess("sensus");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID sensus tidak ada");

  const [before] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.id, id));
  if (!before) throw new Error("Baris sensus tidak ditemukan");

  const input = formToSensusInput(formData);

  // Pre-check paspor supaya pesannya jelas (unique constraint di DB juga
  // menangkapnya, tapi errornya mentah).
  if (input.passportNumber && (await passportTakenByAnotherUser(before.userId, input.passportNumber))) {
    throw new Error("Nomor paspor ini sudah dipakai baris sensus lain");
  }

  // Admin boleh menyimpan data yang belum lengkap; status dihitung ulang, bukan
  // dipaksa. Kalau semua field wajib + formatnya benar -> "complete".
  const issues = validateSensus(input);
  const completionStatus = issues.length === 0 ? ("complete" as const) : ("incomplete" as const);

  const [after] = await db
    .update(sensusProfiles)
    .set({ ...toValues(input), completionStatus, updatedAt: new Date() })
    .where(eq(sensusProfiles.id, id))
    .returning();

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "sensus_profile",
    entityId: id,
    action: "updated",
    beforeJson: before,
    afterJson: after,
  });

  revalidatePath("/console/sensus");
  revalidatePath(`/console/sensus/${id}`);
  redirect(`/console/sensus/${id}`);
}

export async function deleteSensusProfile(id: string): Promise<void> {
  const session = await requireModuleAccess("sensus");
  const [before] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.id, id));
  if (!before) redirect("/console/sensus");

  await db.delete(sensusProfiles).where(eq(sensusProfiles.id, id));

  await db.insert(auditLogs).values({
    actorUserId: session.user.id,
    entityType: "sensus_profile",
    entityId: id,
    action: "deleted",
    beforeJson: before,
    afterJson: null,
  });

  revalidatePath("/console/sensus");
  redirect("/console/sensus");
}
