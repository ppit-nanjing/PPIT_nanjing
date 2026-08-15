"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { mentorshipApplications } from "@/db/schema";

export async function applyForMentorship(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const preferredField = String(formData.get("preferredField") ?? "").trim();
  const background = String(formData.get("background") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  if (!motivation) throw new Error("Motivasi wajib diisi");

  await db.insert(mentorshipApplications).values({
    userId: session.user.id,
    preferredField: preferredField || null,
    background: background || null,
    motivation,
  });

  redirect("/career/mentorship/success");
}
