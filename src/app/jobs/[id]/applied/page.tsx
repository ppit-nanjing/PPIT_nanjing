import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CheckCircle2 } from "lucide-react";

export default async function JobAppliedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job] = await db.select().from(jobPostings).where(eq(jobPostings.id, id));
  if (!job) notFound();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">Lamaran Terkirim</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Lamaranmu untuk posisi <strong>{job.title}</strong> di {job.company} sudah kami terima.
          Tim terkait akan menghubungimu jika lolos ke tahap berikutnya.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/jobs"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            Cari Lowongan Lain
          </a>
          <a
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Kembali ke Beranda
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
