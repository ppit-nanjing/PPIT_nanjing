import { desc, eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { jobApplications, jobPostings } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { JOB_TYPE_LABEL, type JobType } from "@/lib/job-application";
import { FlashToast } from "@/components/console/flash-toast";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";

export default async function ConsoleJobsPage() {
  await requireModuleAccess("career");

  const rowsQuery = db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      type: jobPostings.type,
      status: jobPostings.status,
      applicationDeadline: jobPostings.applicationDeadline,
      applyUrl: jobPostings.applyUrl,
      externalClicks: jobPostings.externalClicks,
      createdAt: jobPostings.createdAt,
      applicants: sql<number>`count(${jobApplications.id})::int`,
    })
    .from(jobPostings)
    .leftJoin(jobApplications, eq(jobApplications.jobId, jobPostings.id))
    .groupBy(jobPostings.id)
    .orderBy(desc(jobPostings.createdAt));

  const [guide, rows] = await Promise.all([getGuide("karier"), rowsQuery]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <FlashToast />
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Lowongan</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Lowongan yang tampil di halaman Jobs (/jobs), dan lamaran yang masuk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {guide && <GuideButton title={guide.title} content={guide.content} docSlug="karier" />}
          <Link
            href="/console/jobs/new"
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors"
          >
            <Plus size={14} /> Tambah Lowongan
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">Belum ada lowongan.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/console/jobs/${r.id}`}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-3 hover:bg-surface-container-low transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-body-md text-on-background truncate">{r.title}</span>
                <span className="block text-body-sm text-on-surface-variant truncate">
                  {r.company} &middot; {JOB_TYPE_LABEL[r.type as JobType]}
                  {r.applicationDeadline ? ` · batas ${r.applicationDeadline}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                  {r.applyUrl
                    ? `Situs perusahaan · ${r.externalClicks} klik${r.applicants > 0 ? ` · ${r.applicants} pelamar` : ""}`
                    : `${r.applicants} pelamar`}
                </span>
                <span
                  className={`text-label-caps uppercase tracking-wide px-2 py-1 rounded ${
                    r.status === "open"
                      ? "bg-primary-container/15 text-primary-container"
                      : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  {r.status === "open" ? "Dibuka" : "Ditutup"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
