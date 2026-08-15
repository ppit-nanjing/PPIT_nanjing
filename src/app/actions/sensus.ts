"use server";

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
}

export async function submitSensusProfile(returnTo: string | null, input: SensusInput) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db
    .insert(sensusProfiles)
    .values({
      userId: session.user.id,
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
      completionStatus: "complete",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sensusProfiles.userId,
      set: {
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
        completionStatus: "complete",
        updatedAt: new Date(),
      },
    });

  // Only redirect to a same-origin path - returnTo comes from a query param, so
  // treat it as untrusted input (open-redirect guard).
  redirect(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/sensus/success");
}
