"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";
import { validateSensus, type SensusInput, type SensusIssue } from "@/lib/sensus-form";

// Tipe & aturan validasinya ada di src/lib/sensus-form.ts — berkas "use server"
// hanya boleh mengekspor fungsi async, jadi tipe dan konstanta tidak bisa
// tinggal di sini; pemakainya mengimpor langsung dari lib itu.

function toValues(input: SensusInput) {
  return {
    fullName: input.fullName || null,
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
    fundingSource: input.fundingSource || null,
    entryYear: input.entryYear ? Number(input.entryYear) : null,
    graduationYear: input.graduationYear ? Number(input.graduationYear) : null,
    wechatId: input.wechatId || null,
    phoneActive: input.phoneActive || null,
    whatsappNumber: input.whatsappNumber || null,
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
