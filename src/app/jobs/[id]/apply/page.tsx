import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { applyToJob } from "@/app/actions/jobs";
import { FileUpload } from "@/components/upload/file-upload";

export default async function JobApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">Lamar: {job.title}</h1>
        <p className="text-body-md text-on-surface-variant mb-10">{job.company}</p>

        <form action={applyToJob.bind(null, id)} className="flex flex-col gap-6">
          <FileUpload
            name="resumeUrl"
            folder="resume"
            label="Resume/CV *"
            placeholder="Tempel URL Drive atau unggah PDF"
            accept="application/pdf"
            required
          />
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Cover Letter (opsional)
            </span>
            <textarea
              name="coverLetter"
              rows={6}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <button
            type="submit"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors"
          >
            Kirim Lamaran
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
