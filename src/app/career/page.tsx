import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { jobPostings, careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { Briefcase, BookOpen, Users, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pusat Karir - PPIT Nanjing",
  description: "Peluang kerja, panduan karir, dan mentorship untuk mahasiswa PPIT Nanjing.",
};

const TYPE_LABEL: Record<string, string> = {
  internship: "Magang",
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
};

function excerpt(content: string | null, length = 120): string {
  if (!content) return "";
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > length ? plain.slice(0, length).trim() + "…" : plain;
}

export default async function CareerCenterPage() {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.status, "open")).orderBy(desc(jobPostings.createdAt)).limit(6);
  const guides = await db.select().from(careerGuideArticles).orderBy(desc(careerGuideArticles.publishedAt)).limit(4);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] pt-16 pb-10 text-center flex flex-col items-center">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">Pusat Karir</h1>
        <p className="text-body-lg text-on-surface-variant">
          Peluang kerja, panduan karir, dan program mentorship untuk mahasiswa PPIT Nanjing.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 flex flex-col gap-16">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-md text-on-background flex items-center gap-2">
              <Briefcase size={20} className="text-primary-container" /> Peluang Terbaru
            </h2>
            <Link href="/jobs" className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none">
              Lihat Semua
            </Link>
          </div>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center text-center py-16 bg-surface-container-lowest border border-outline-variant border-dashed rounded-xl px-6">
                <Briefcase className="text-outline-variant mb-4" size={36} aria-hidden />
                <p className="text-body-md text-on-surface-variant">Belum ada lowongan dibuka saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobs.map((j) => (
                  <a
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    aria-label={`Lihat lowongan ${j.title} di ${j.company}`}
                    className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 bg-surface-container-low rounded-lg flex items-center justify-center text-primary-container">
                      <Briefcase size={20} />
                    </div>
                    <span className="bg-primary-container/10 text-primary-container text-label-caps uppercase px-2.5 py-1 rounded-md">
                      {TYPE_LABEL[j.type] ?? j.type}
                    </span>
                  </div>
                  <h3 className="text-body-md font-semibold text-on-background mb-1 group-hover:text-primary-container transition-colors">
                    {j.title}
                  </h3>
                  <p className="text-body-md text-on-surface-variant mb-3">{j.company}</p>
                  {j.location && (
                    <span className="flex items-center gap-1 text-label-caps text-secondary mb-4">
                      <MapPin size={12} /> {j.location}
                    </span>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
                    <span className="text-label-caps text-on-surface-variant">{formatRelativeTime(j.createdAt)}</span>
                    <span className="flex items-center gap-1 text-label-caps uppercase text-primary-container">
                      Detail <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-headline-md text-on-background mb-2">Panduan &amp; Sumber Daya Karir</h2>
          <p className="text-body-md text-on-surface-variant max-w-2xl mb-6">
            Tingkatkan peluangmu dengan materi persiapan karir untuk mahasiswa Indonesia di Tiongkok.
          </p>
            {guides.length === 0 ? (
              <div className="flex flex-col items-center text-center py-16 bg-surface-container-lowest border border-outline-variant border-dashed rounded-xl px-6">
                <BookOpen className="text-outline-variant mb-4" size={36} aria-hidden />
                <p className="text-body-md text-on-surface-variant">Belum ada artikel panduan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guides.map((g) => (
                  <a
                    key={g.id}
                    href={`/career/guide/${g.slug}`}
                    aria-label={`Baca panduan ${g.title}`}
                    className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex gap-4 items-start hover:border-primary-container/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                  <div className="bg-surface-container-low p-3 rounded-lg text-primary-container shrink-0">
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <h3 className="text-body-md font-semibold text-on-background mb-1 group-hover:text-primary-container transition-colors">
                      {g.title}
                    </h3>
                    {g.category && <p className="text-label-caps uppercase text-on-surface-variant mb-2">{g.category}</p>}
                    {g.content && <p className="text-body-md text-on-surface-variant mb-3">{excerpt(g.content)}</p>}
                    <span className="text-label-caps uppercase tracking-wide text-primary-container">Baca Artikel</span>
                  </div>
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
            <Link
              href="/career/mentorship"
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
            Daftar Mentorship
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
