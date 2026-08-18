"use server";

import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobApplications, jobPostings } from "@/db/schema";
import { requireCompletedSensus } from "@/lib/sensus-gate";
import { createTemplatedNotification } from "@/lib/notifications";

export async function applyToJob(jobId: string, formData: FormData) {
  const session = await requireCompletedSensus(`/jobs/${jobId}/apply`);

  const resumeUrl = String(formData.get("resumeUrl") ?? "").trim();
  const coverLetter = String(formData.get("coverLetter") ?? "").trim();
  if (!resumeUrl) throw new Error("Tautan resume/CV wajib diisi");

  const [existing] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, session.user.id)));

  if (existing) redirect(`/jobs/${jobId}/applied`);

  const [job] = await db.select({ title: jobPostings.title }).from(jobPostings).where(eq(jobPostings.id, jobId));

  await db.insert(jobApplications).values({
    jobId,
    userId: session.user.id,
    resumeUrl,
    coverLetter: coverLetter || null,
  });

  // In-app confirmation for the member who just applied.
  await createTemplatedNotification({
    userId: session.user.id,
    templateKey: "job_application",
    variables: { jobTitle: job?.title ?? "lowongan" },
    relatedEntityType: "job",
    relatedEntityId: jobId,
  });

  redirect(`/jobs/${jobId}/applied`);
}
