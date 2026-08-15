import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MapPin, Calendar, CheckCircle2 } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded mb-4 inline-block">
          {TYPE_LABEL[job.type] ?? job.type}
        </span>
        <h1 className="text-headline-lg text-on-background mb-2">{job.title}</h1>
        <p className="text-body-lg text-on-surface-variant mb-6">{job.company}</p>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-md text-on-surface-variant mb-10">
          {job.location && (
            <span className="flex items-center gap-2">
              <MapPin size={16} /> {job.location}
            </span>
          )}
          {job.applicationDeadline && (
            <span className="flex items-center gap-2">
              <Calendar size={16} /> Deadline: {new Date(job.applicationDeadline).toLocaleDateString("id-ID")}
            </span>
          )}
        </div>

        {job.description && (
          <section className="mb-8">
            <h2 className="text-headline-md text-on-background mb-3">Deskripsi</h2>
            <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">{job.description}</p>
          </section>
        )}
        {job.requirements && (
          <section className="mb-10">
            <h2 className="text-headline-md text-on-background mb-3">Kualifikasi</h2>
            <p className="text-body-md text-on-surface-variant whitespace-pre-wrap">{job.requirements}</p>
          </section>
        )}

        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8">
          {alreadyApplied ? (
            <p className="flex items-center gap-2 text-body-md text-on-background">
              <CheckCircle2 className="text-primary-container" size={20} /> Kamu sudah melamar posisi ini.
            </p>
          ) : job.status === "open" ? (
            <a
              href={`/jobs/${id}/apply`}
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:bg-primary transition-colors"
            >
              Lamar Sekarang
            </a>
          ) : (
            <p className="text-body-md text-on-surface-variant">Lowongan ini sudah ditutup.</p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
