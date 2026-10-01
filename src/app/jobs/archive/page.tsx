import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Archive, ArrowLeft, MapPin } from "lucide-react";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { isJobExpired } from "@/lib/job-application";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const TYPE_KEYS: Record<string, TKey> = {
  internship: "jobs.type.internship",
  full_time: "jobs.type.full_time",
  part_time: "jobs.type.part_time",
  volunteer: "jobs.type.volunteer",
};

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("jobs.archiveHeading"), description: t("jobs.archiveIntro") };
}

// Arsip lowongan: yang ditutup pengurus ATAU lewat batas lamaran. Halaman ini
// hanya untuk dibaca - lamaran sudah tidak mungkin (ditegakkan di server).
export default async function JobsArchivePage() {
  const { t } = await getT();
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(jobPostings)
    .where(
      or(
        eq(jobPostings.status, "closed"),
        and(eq(jobPostings.status, "open"), lt(jobPostings.applicationDeadline, today)),
      )!,
    )
    .orderBy(sql`${jobPostings.applicationDeadline} desc nulls last`, desc(jobPostings.createdAt));

  function typeLabel(key: string): string {
    const k = TYPE_KEYS[key];
    return k ? t(k) : key;
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader title={t("jobs.archiveHeading")} intro={t("jobs.archiveIntro")}>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
        >
          <ArrowLeft size={14} aria-hidden /> {t("jobs.archiveBack")}
        </Link>
      </PageHeader>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 flex flex-col gap-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 bg-surface-container-lowest border border-[var(--deco-line)] border-dashed rounded-lg px-6">
            <Archive className="text-outline-variant mb-4" size={40} aria-hidden />
            <p className="text-body-md text-on-surface-variant">{t("jobs.archiveEmpty")}</p>
          </div>
        ) : (
          rows.map((j) => {
            const expired = j.status === "open" && isJobExpired(j.applicationDeadline);
            return (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                aria-label={t("jobs.detailAria", { title: j.title, company: j.company })}
                className="group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 opacity-60 grayscale hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {j.imageUrl && (
                    <span className="relative hidden sm:block w-16 shrink-0 aspect-[3/4] overflow-hidden rounded-md border border-outline-variant bg-surface-container-low">
                      <Image src={j.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-0.5 rounded">
                        {typeLabel(j.type)}
                      </span>
                      <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded">
                        {expired ? t("jobs.expiredBadge") : t("jobs.closedBadge")}
                      </span>
                      <span className="text-label-caps text-secondary">{formatRelativeTime(j.createdAt, t)}</span>
                    </div>
                    <h2 className="text-headline-md text-on-background mb-1">{j.title}</h2>
                    <p className="text-body-md text-on-surface-variant mb-2">{j.company}</p>
                    {j.location && (
                      <span className="flex items-center gap-1 text-label-caps text-secondary">
                        <MapPin size={12} aria-hidden /> {j.location}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="shrink-0 border border-outline text-on-surface-variant text-label-caps uppercase tracking-wide px-5 py-2 rounded-md"
                >
                  {t("jobs.viewDetail")}
                </span>
              </Link>
            );
          })
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
