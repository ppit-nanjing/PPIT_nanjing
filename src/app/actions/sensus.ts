"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";

export interface SensusInput {
  gender: string;
  birthDate: string;
  university: string;
  program: string;
  degreeLevel: string;
  cityInChina: string;
  arrivalDate: string;
  visaType: string;
  scholarshipType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  photoUrl: string;
}

function toValues(input: SensusInput) {
  return {
    gender: input.gender || null,
    birthDate: input.birthDate || null,
    university: input.university || null,
    program: input.program || null,
    degreeLevel: input.degreeLevel || null,
    cityInChina: input.cityInChina || null,
    arrivalDate: input.arrivalDate || null,
    visaType: input.visaType || null,
    scholarshipType: input.scholarshipType || null,
    emergencyContactName: input.emergencyContactName || null,
    emergencyContactPhone: input.emergencyContactPhone || null,
    photoUrl: input.photoUrl || null,
  };
}

export async function submitSensusProfile(returnTo: string | null, input: SensusInput) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Photo is mandatory for a "complete" submission - it's proof the person is
  // actually studying in China, not decoration (confirmed 2026-08-15).
  if (!input.photoUrl.trim()) {
    return { error: "photo_required" as const };
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
