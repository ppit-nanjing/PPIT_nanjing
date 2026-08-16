import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobPostings, jobApplications } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

const APP_STATUS_LABEL: Record<string, string> = {
  submitted: "Terkirim",
  reviewed: "Sedang direview",
  interview: "Tahap wawancara",
  accepted: "Diterima",
  rejected: "Ditolak",
};

export default async function JobAppliedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(`/jobs/${id}/applied`)}`);

  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();

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
          <h1 className="text-headline-lg text-on-background mb-2">Kamu belum melamar</h1>
          <p className="text-body-md text-on-surface-variant mb-10">
            Kamu belum mengirimkan lamaran untuk posisi <strong>{job.title}</strong> di {job.company}.
            Silakan kirim lamaran terlebih dahulu jika tertarik dengan lowongan ini.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/jobs/${id}`}
              className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              Lihat Lowongan
            </a>
            <Link
              href="/jobs"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              Cari Lowongan Lain
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
        <h1 className="text-headline-lg text-on-background mb-2">Lamaran Terkirim</h1>
        <span className="inline-block mb-4 bg-surface-container-low text-on-surface-variant text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full">
          Status: {APP_STATUS_LABEL[application.status] ?? application.status}
        </span>
        <p className="text-body-md text-on-surface-variant mb-10">
          Lamaranmu untuk posisi <strong>{job.title}</strong> di {job.company} sudah kami terima.
          Tim terkait akan menghubungimu jika lolos ke tahap berikutnya.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/jobs"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Cari Lowongan Lain
          </Link>
          <Link
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
