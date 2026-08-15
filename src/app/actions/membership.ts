"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { membershipApplications, recruitmentPeriods } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

export async function submitMembershipApplication(recruitmentPeriodId: string, formData: FormData) {
  const [period] = await db.select().from(recruitmentPeriods).where(eq(recruitmentPeriods.id, recruitmentPeriodId));
  if (!period?.isOpen) throw new Error("Pendaftaran sedang tidak dibuka");

  const session = await auth();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const expectedGraduation = String(formData.get("expectedGraduation") ?? "").trim();
  const divisionInterest = String(formData.get("divisionInterest") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  const commitment = String(formData.get("commitment") ?? "").trim();
  if (!fullName || !email) throw new Error("Nama dan email wajib diisi");

  await db.insert(membershipApplications).values({
    recruitmentPeriodId,
    userId: session?.user?.id ?? null,
    fullName,
    email,
    whatsapp: whatsapp || null,
    university: university || null,
    major: major || null,
    expectedGraduation: expectedGraduation || null,
    divisionInterest: divisionInterest || null,
    motivation: motivation || null,
    commitment: commitment || null,
  });

  redirect("/join-us/success");
}

const STATUS_VALUES = ["pending", "reviewed", "accepted", "rejected"] as const;

export async function updateMembershipStatus(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  if (!STATUS_VALUES.includes(rawStatus as (typeof STATUS_VALUES)[number])) throw new Error("Status tidak valid");
  const status = rawStatus as (typeof STATUS_VALUES)[number];
  await db.update(membershipApplications).set({ status, reviewedAt: new Date() }).where(eq(membershipApplications.id, id));
  revalidatePath("/console/membership");
  revalidatePath(`/console/membership/${id}`);
}

export async function updateMembershipNote(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  await db.update(membershipApplications).set({ note: note || null }).where(eq(membershipApplications.id, id));
  revalidatePath(`/console/membership/${id}`);
}

export async function deleteMembershipApplication(formData: FormData) {
  await requireModuleAccess("membership");
  const id = String(formData.get("id") ?? "");
  await db.delete(membershipApplications).where(eq(membershipApplications.id, id));
  revalidatePath("/console/membership");
  redirect("/console/membership");
}
