import { eq, desc, asc } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { ContentCard } from "@/components/content-card";
import { StatsGrid } from "@/components/stats-grid";
import { CitiesGrid } from "@/components/cities-grid";
import { QuoteMark } from "@/components/quote-mark";
import { db } from "@/db";
import { events, newsArticles } from "@/db/schema";

const CITIES = [
  {
    name: "Nanjing",
    blurb: "Ibu kota provinsi Jiangsu sekaligus markas utama PPIT Nanjing.",
    detail:
      "Sebagai pusat PPIT Cabang Nanjing, kota ini jadi rumah bagi sebagian besar pelajar Indonesia di wilayah ini. Di sini berpusat kegiatan rutin, forum, hingga kolaborasi antar-ranting.",
  },
  {
    name: "Xuzhou",
    blurb: "Kota industri & transportasi di utara Jiangsu dengan komunitas pelajar aktif.",
    detail:
      "Terkenal sebagai hub kereta api utara Jiangsu, Xuzhou menghimpun pelajar dari beberapa kampus dengan kegiatan komunitas yang solid dan saling suport.",
  },
  {
    name: "Jurong",
    blurb: "Kawasan kampus yang menghimpun pelajar Indonesia di sekitarnya.",
    detail:
      "Kawasan ini menjadi titik kumpul yang hangat bagi mahasiswa Indonesia setempat, sering kali terhubung dengan kegiatan di Nanjing.",
  },
  {
    name: "Ma'anshan",
    blurb: "Kota di Anhui yang berbatasan dekat dengan Nanjing.",
    detail:
      "Kota industri di provinsi Anhui yang letaknya sangat dekat dengan Nanjing, sehingga kerap terlibat dalam kegiatan lintas-kota PPIT.",
  },
  {
    name: "Zhenjiang",
    blurb: "Kota tepi Sungai Yangtze dengan cukup banyak mahasiswa Indonesia.",
    detail:
      "Berada di tepi Sungai Yangtze, Zhenjiang dihuni cukup banyak mahasiswa Indonesia yang aktif dalam jaringan PPIT Nanjing.",
  },
  {
    name: "Huai'an",
    blurb: "Kota historis di utara Jiangsu, salah satu ranting aktif PPIT.",
    detail:
      "Kota bersejarah di utara Jiangsu yang merupakan salah satu ranting aktif, turut memperluas jangkauan PPIT di luar Nanjing.",
  },
];

export default async function Home() {
  const latestEvents = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(asc(events.startAt))
    .limit(3);
  const latestNews = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.status, "published"))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(3);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="relative w-full h-[600px] md:h-[680px] flex items-center justify-center overflow-hidden bg-on-background">
        {/* Layered depth: deep base -> directional glow -> decorative skyline silhouette.
            Placeholder for a licensed Nanjing photograph (see docs/Design System/Iconography & Imagery.md) -
            original vector art only, no hotlinked/unlicensed images. */}
        <div className="absolute inset-0 bg-gradient-to-b from-on-background via-primary/40 to-on-background" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_20%,var(--color-primary-container)_0%,transparent_55%)] opacity-70" />
        <svg
          className="absolute bottom-0 left-0 w-full h-[45%] opacity-80"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 300V180l60-20 20-40 20 40 40-60 40 60 20-30 20 30 80-90 80 90 30-40 30 40 60-70 60 70 40-50 40 50 60-30 60 30 40-60 40 60 60-20 60 20V300Z"
            fill="var(--color-on-background)"
            opacity="0.9"
          />
        </svg>
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_20%_30%,white_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 text-center px-[var(--spacing-container-padding)] max-w-3xl mx-auto flex flex-col items-center">
          <span className="text-label-caps uppercase tracking-[0.2em] text-inverse-primary border border-inverse-primary/40 rounded-full px-4 py-1.5 mb-6">
            EST. 2008
          </span>
          <AnimatedHeroHeading
            words={["Menghubungkan", "Mahasiswa", "Indonesia", "di", "Nanjing"]}
            className="text-display-hero-mobile md:text-display-hero text-on-primary mb-[var(--spacing-stack-md)]"
          />
          <AnimatedRevealText
            text="Wadah resmi Perhimpunan Pelajar Indonesia Tiongkok (PPIT) Cabang Nanjing untuk bersinergi, berkarya, dan berkontribusi bagi bangsa — sejak 2008."
            className="text-body-lg text-on-primary-container mb-[var(--spacing-stack-md)] max-w-2xl"
          />
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-on-primary text-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:scale-105 transition-transform"
          >
            Jelajahi Kegiatan <ArrowRight size={18} />
          </Link>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex flex-col gap-16 md:gap-[var(--spacing-section-gap)] py-16 md:py-[var(--spacing-section-gap)]">
        {/* Stats */}
        <StatsGrid />

        {/* Quote */}
        <Reveal>
          <section className="flex justify-center">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(39,23,22,0.04)] max-w-4xl w-full p-10 md:p-16">
              <QuoteMark />
              <p className="text-quote-text text-on-surface italic mb-8">
                &ldquo;PPIT Nanjing adalah{" "}
                <span className="font-bold text-primary-container not-italic">
                  rumah bagi ribuan mimpi
                </span>{" "}
                anak bangsa di kota bersejarah ini. Melalui{" "}
                <span className="font-bold text-primary-container not-italic">kolaborasi</span> dan
                semangat{" "}
                <span className="font-bold text-primary-container not-italic">gotong royong</span>,
                kita pastikan setiap pelajar Indonesia di sini memiliki support system terbaik untuk
                berkarya dan berkontribusi.&rdquo;
              </p>
              <h4 className="text-headline-md text-on-background mb-1">Ketua Umum PPIT Nanjing</h4>
              <p className="text-label-caps text-secondary uppercase">Periode 2026-2027</p>
            </div>
          </section>
        </Reveal>

        {/* Cities under PPIT Nanjing's umbrella */}
        <Reveal>
          <section className="flex flex-col gap-8">
            <SectionHeading
              kicker="Jangkauan Wilayah"
              title="Kota di Bawah Naungan PPIT Nanjing"
              description="Selain Kota Nanjing, PPIT Nanjing turut menaungi pelajar dan mahasiswa Indonesia di kota-kota sekitarnya. Klik tiap kartu untuk membaca selengkapnya tentang peran masing-masing kota."
            />
            <CitiesGrid cities={CITIES} />
          </section>
        </Reveal>

        {/* Latest Events - only renders once an admin has published something via /console/events */}
        {latestEvents.length > 0 && (
          <Reveal>
            <section className="flex flex-col gap-8">
              <SectionHeading kicker="Kegiatan Terbaru" title="Latest Events" href="/events" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {latestEvents.map((e) => (
                  <ContentCard
                    key={e.id}
                    href={`/events/${e.slug}`}
                    imageUrl={e.coverImageUrl}
                    eyebrow={e.category}
                    meta={e.startAt ? new Date(e.startAt).toLocaleDateString("id-ID", { dateStyle: "medium" }) : ""}
                    title={e.title}
                    excerpt={e.description}
                  />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Latest News - same honesty rule: no section rendered until real content exists */}
        {latestNews.length > 0 && (
          <Reveal>
            <section className="flex flex-col gap-8">
              <SectionHeading kicker="Kabar Terbaru" title="Latest News" href="/news" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {latestNews.map((a) => (
                  <ContentCard
                    key={a.id}
                    href={`/news/${a.slug}`}
                    imageUrl={a.coverImageUrl}
                    fallbackIcon="news"
                    metaIcon={false}
                    meta={a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID") : ""}
                    title={a.title}
                    excerpt={a.content}
                  />
                ))}
              </div>
            </section>
          </Reveal>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
