import { eq, and, ne, or, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatRelativeTime } from "@/lib/format-relative-time";
import Link from "next/link";
import { MapPin, Calendar, CheckCircle2, Info, ClipboardCheck, Building2, History, ArrowLeft } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  internship: "Magang",
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();

  const session = await auth();
  let alreadyApplied = false;
  if (session?.user?.id) {
    const [existing] = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, id), eq(jobApplications.userId, session.user.id)));
    alreadyApplied = !!existing;
  }

  const similar = await db
    .select()
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.status, "open"),
        ne(jobPostings.id, id),
        or(eq(jobPostings.type, job.type), job.location ? eq(jobPostings.location, job.location) : undefined)
      )
    )
    .orderBy(desc(jobPostings.createdAt))
    .limit(3);

  const deadlineSoon =
    job.applicationDeadline &&
    new Date(job.applicationDeadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const applyCta = alreadyApplied ? (
    <div className="flex flex-col items-center gap-3">
      <p className="flex items-center gap-2 text-body-md text-on-background">
        <CheckCircle2 className="text-primary-container" size={20} aria-hidden /> Kamu sudah melamar posisi ini.
      </p>
      <Link
        href={`/jobs/${id}/applied`}
        className="block w-full text-center border border-primary-container text-primary-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary-container hover:text-on-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        Lihat Status Lamaran
      </Link>
    </div>
  ) : job.status === "open" ? (
    <div className="flex flex-col items-center gap-3">
      <a
        href={`/jobs/${id}/apply`}
        aria-label={`Lamar posisi ${job.title}`}
        className="block w-full text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        Lamar Sekarang
      </a>
      {!session && (
        <p className="text-label-caps text-on-surface-variant text-center">
          Perlu login untuk melamar.
        </p>
      )}
    </div>
  ) : (
    <p className="text-center text-body-md text-on-surface-variant rounded-md bg-surface-container-low px-4 py-3">
      Lowongan ini sudah ditutup.
    </p>
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
          <div className="max-w-3xl">
            <Link
              href="/jobs"
              aria-label="Kembali ke daftar lowongan"
              className="inline-flex items-center gap-1.5 mb-6 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
            >
              <ArrowLeft size={14} aria-hidden /> Lowongan
            </Link>
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full">
                {TYPE_LABEL[job.type] ?? job.type}
              </span>
              <span className="bg-surface-container-low text-on-surface-variant text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full flex items-center gap-1">
                <History size={13} aria-hidden /> {formatRelativeTime(job.createdAt)}
              </span>
              {deadlineSoon && (
                <span className="bg-error-container/30 text-error text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full">
                  Segera ditutup
                </span>
              )}
            </div>
            <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-3">{job.title}</h1>
            <h2 className="text-headline-md text-secondary mb-6">{job.company}</h2>
            <div className="flex flex-wrap gap-6 text-body-md text-on-surface-variant">
              {job.location && (
                <span className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary-container" /> {job.location}
                </span>
              )}
              {job.applicationDeadline && (
                <span className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary-container" />
                  Batas: {new Date(job.applicationDeadline).toLocaleDateString("id-ID")}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
          {job.description && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
              <h3 className="text-headline-md text-on-background mb-4 flex items-center gap-2 border-b border-outline-variant pb-4">
                <Info size={20} className="text-primary-container" /> Deskripsi
              </h3>
              <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </section>
          )}
          {job.requirements && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
              <h3 className="text-headline-md text-on-background mb-4 flex items-center gap-2 border-b border-outline-variant pb-4">
                <ClipboardCheck size={20} className="text-primary-container" /> Kualifikasi
              </h3>
              <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
            </section>
          )}
        </div>

        <div className="lg:col-span-4">
          <div aria-label="Ringkasan lowongan" className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <div className="flex items-center justify-center h-16 w-16 mx-auto bg-surface-container-low rounded-lg mb-4 text-primary-container">
              <Building2 size={28} aria-hidden />
            </div>
            <h4 className="text-headline-md text-on-background mb-1 text-center">{job.company}</h4>
            {job.location && <p className="text-body-md text-on-surface-variant text-center mb-6">{job.location}</p>}
            <div className="border-t border-outline-variant pt-6">{applyCta}</div>
          </div>
        </div>
      </main>

      {similar.length > 0 && (
        <section className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
          <h2 className="text-headline-lg text-on-background mb-8 border-t border-outline-variant pt-16">
            Lowongan Serupa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {similar.map((j) => (
              <a
                key={j.id}
                href={`/jobs/${j.id}`}
                aria-label={`Lihat lowongan serupa ${j.title} di ${j.company}`}
                className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-0.5 rounded">
                  {TYPE_LABEL[j.type] ?? j.type}
                </span>
                <h3 className="text-body-md font-semibold text-on-background mt-3 mb-1">{j.title}</h3>
                <p className="text-body-md text-on-surface-variant">{j.company}</p>
                {j.location && (
                  <span className="flex items-center gap-1 text-label-caps text-secondary mt-3">
                    <MapPin size={12} /> {j.location}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
