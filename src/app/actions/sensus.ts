"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";

export interface SensusInput {
  // BIODATA
  fullName: string;
  passportNumber: string;
  gender: string;
  passportExpiry: string;
  province: string;
  birthDate: string;
  // DATA MAHASISWA
  branch: string;
  studentStatus: string;
  university: string;
  degreeLevel: string;
  major: string;
  fundingSource: string;
  entryYear: string;
  graduationYear: string;
  // KONTAK
  wechatId: string;
  phoneActive: string;
  whatsappNumber: string;
  // Dokumen & persetujuan
  studentCardUrl: string;
  agreeTerms: boolean;
}

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
  };
}

export async function submitSensusProfile(returnTo: string | null, input: SensusInput) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Kartu Tanda Mahasiswa wajib - bukti mahasiswa aktif di Tiongkok.
  if (!input.studentCardUrl.trim()) {
    return { error: "student_card_required" as const };
  }
  // Persetujuan syarat, ketentuan, dan kebijakan privasi wajib dicentang.
  if (!input.agreeTerms) {
    return { error: "terms_required" as const };
  }

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
