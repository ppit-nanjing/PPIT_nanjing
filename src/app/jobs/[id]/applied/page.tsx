import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const STATUS_KEYS: Record<string, TKey> = {
  submitted: "jobs.status.submitted",
  reviewed: "jobs.status.reviewed",
  interview: "jobs.status.interview",
  accepted: "jobs.status.accepted",
  rejected: "jobs.status.rejected",
};

function statusLabel(t: T, key: string): string {
  const k = STATUS_KEYS[key];
  return k ? t(k) : key;
}

export default async function JobAppliedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/jobs/${id}/applied`)}`);

  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();

  const { t } = await getT();

  const [application] = await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.userId, session.user.id), eq(jobApplications.jobId, id)));

  if (!application) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        <SiteNav />
        <main role="status" aria-live="polite" className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-on-surface-variant" size={28} aria-hidden />
          </div>
          <h1 className="text-headline-lg text-on-background mb-2">{t("jobs.notAppliedTitle")}</h1>
          <p className="text-body-md text-on-surface-variant mb-10">
            {t("jobs.notAppliedDesc", { title: job.title, company: job.company })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/jobs/${id}`}
              className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              {t("jobs.viewJob")}
            </a>
            <Link
              href="/jobs"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              {t("jobs.findOther")}
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main role="status" aria-live="polite" className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} aria-hidden />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">{t("jobs.submittedTitle")}</h1>
        <span className="inline-block mb-4 bg-surface-container-low text-on-surface-variant text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full">
          {t("jobs.statusLabel", { status: statusLabel(t, application.status) })}
        </span>
        <p className="text-body-md text-on-surface-variant mb-10">
          {t("jobs.submittedDesc", { title: job.title, company: job.company })}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/jobs"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("jobs.findOther")}
          </Link>
          <Link
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("jobs.backHome")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
