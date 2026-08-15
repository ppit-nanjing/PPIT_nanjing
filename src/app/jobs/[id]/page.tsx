import { eq, and, ne, or, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { MapPin, Calendar, CheckCircle2, Info, ClipboardCheck, Building2, History } from "lucide-react";

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

  const applyCta = alreadyApplied ? (
    <p className="flex items-center gap-2 text-body-md text-on-background">
      <CheckCircle2 className="text-primary-container" size={20} /> Kamu sudah melamar posisi ini.
    </p>
  ) : job.status === "open" ? (
    <a
      href={`/jobs/${id}/apply`}
      className="block w-full text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors"
    >
      Lamar Sekarang
    </a>
  ) : (
    <p className="text-body-md text-on-surface-variant">Lowongan ini sudah ditutup.</p>
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full">
                {TYPE_LABEL[job.type] ?? job.type}
              </span>
              <span className="bg-surface-container-low text-on-surface-variant text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full flex items-center gap-1">
                <History size={13} /> {formatRelativeTime(job.createdAt)}
              </span>
            </div>
            <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-3">{job.title}</h1>
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
          <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <div className="flex items-center justify-center h-16 w-16 mx-auto bg-surface-container-low rounded-lg mb-4 text-primary-container">
              <Building2 size={28} />
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
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
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
