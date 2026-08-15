import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { jobPostings, careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Briefcase, BookOpen, Users } from "lucide-react";

export default async function CareerCenterPage() {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.status, "open")).limit(4);
  const guides = await db.select().from(careerGuideArticles).orderBy(desc(careerGuideArticles.publishedAt)).limit(4);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Pusat Karir</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Peluang kerja, panduan karir, dan program mentorship untuk mahasiswa PPIT Nanjing.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 flex flex-col gap-14">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md text-on-background flex items-center gap-2">
              <Briefcase size={20} className="text-primary-container" /> Peluang Terbaru
            </h2>
            <a href="/jobs" className="text-label-caps text-primary-container hover:text-primary">
              Lihat Semua
            </a>
          </div>
          {jobs.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Belum ada lowongan dibuka.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((j) => (
                <a
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:bg-surface-container-low transition-colors"
                >
                  <h3 className="text-body-md font-semibold text-on-background">{j.title}</h3>
                  <p className="text-label-caps text-on-surface-variant">{j.company}</p>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-md text-on-background flex items-center gap-2">
              <BookOpen size={20} className="text-primary-container" /> Panduan Karir
            </h2>
          </div>
          {guides.length === 0 ? (
            <p className="text-body-md text-on-surface-variant">Belum ada artikel panduan.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((g) => (
                <a
                  key={g.id}
                  href={`/career/guide/${g.slug}`}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:bg-surface-container-low transition-colors"
                >
                  <h3 className="text-body-md font-semibold text-on-background">{g.title}</h3>
                  {g.category && <p className="text-label-caps text-on-surface-variant">{g.category}</p>}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="bg-primary-container/5 border border-primary-container/20 rounded-xl p-8 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Users className="text-primary-container" size={28} />
            <div>
              <h2 className="text-headline-md text-on-background">Alumni Network Mentorship</h2>
              <p className="text-body-md text-on-surface-variant">
                Terhubung dengan alumni PPIT Nanjing untuk bimbingan karir.
              </p>
            </div>
          </div>
          <a
            href="/career/mentorship"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors shrink-0"
          >
            Daftar Mentorship
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
