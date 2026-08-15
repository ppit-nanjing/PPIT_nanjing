"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";

export async function submitMembershipApplication(recruitmentPeriodId: string, formData: FormData) {
  const [period] = await db.select().from(recruitmentPeriods).where(eq(recruitmentPeriods.id, recruitmentPeriodId));
  if (!period?.isOpen) throw new Error("Pendaftaran sedang tidak dibuka");

  const session = await auth();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  if (!fullName || !email) throw new Error("Nama dan email wajib diisi");

  await db.insert(membershipApplications).values({
    recruitmentPeriodId,
    userId: session?.user?.id ?? null,
    fullName,
    email,
    university: university || null,
    motivation: motivation || null,
  });

  redirect("/join-us/success");
}
