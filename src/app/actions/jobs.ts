"use server";

import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobApplications } from "@/db/schema";

export async function applyToJob(jobId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  if (!resumeUrl) throw new Error("Tautan resume/CV wajib diisi");

  const [existing] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, session.user.id)));

  if (existing) redirect(`/jobs/${jobId}/applied`);

  await db.insert(jobApplications).values({
    jobId,
    userId: session.user.id,
    resumeUrl,
    coverLetter: coverLetter || null,
  });

  redirect(`/jobs/${jobId}/applied`);
}
