import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { applyToJob } from "@/app/actions/jobs";
import { FileUpload } from "@/components/upload/file-upload";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { isJobExpired } from "@/lib/job-application";

export default async function JobApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const currentPath = `/jobs/${id}/apply`;
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(currentPath)}`);

  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();
  // Lowongan yang ditutup pengurus tidak boleh dilamar lagi, termasuk lewat
  // tautan langsung atau tab yang sudah terbuka (applyToJob menjaga hal yang sama).
  // Lowongan yang melamar lewat situs perusahaan tidak punya form di sini.
  // Lewat batas lamaran juga ditolak di sini - bukan hanya di tombolnya.
  if (job.status !== "open" || job.applyUrl || isJobExpired(job.applicationDeadline)) redirect(`/jobs/${id}`);

  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <PageHeader title={t("jobs.applyTitle", { title: job.title })} intro={job.company}>
        <Link
          href={`/jobs/${id}`}
          aria-label={t("jobs.backToDetailAria")}
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden /> {t("jobs.detailLabel")}
        </Link>
      </PageHeader>

      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-12">
        <form action={applyToJob.bind(null, id)} className="flex flex-col gap-6">
          <FileUpload
            name="resumeUrl"
            folder="resume"
            label={t("jobs.resumeLabel")}
            placeholder={t("jobs.resumePlaceholder")}
            accept="application/pdf"
            required
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="coverLetter"
              className="text-label-caps uppercase tracking-wide text-on-surface-variant"
            >
              {t("jobs.coverLetterLabel")}
            </label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              rows={6}
              aria-describedby="coverLetter-help"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container resize-none"
            />
            <p id="coverLetter-help" className="text-body-sm text-on-surface-variant">
              {t("jobs.coverLetterHelp")}
            </p>
          </div>
          <button
            type="submit"
            className="deco-btn bg-accent text-on-accent text-label-caps uppercase py-3.5 rounded-md hover:brightness-95 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("jobs.submitApplication")}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
