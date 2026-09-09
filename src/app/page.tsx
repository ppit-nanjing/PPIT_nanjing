import { eq, desc, asc, count } from "drizzle-orm";
import Link from "next/link";
import { MovingArrow } from "@/components/icons/moving-arrow";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { ContentCard } from "@/components/content-card";
import { EmptyState } from "@/components/empty-state";
import { StatsGrid } from "@/components/stats-grid";
import { CitiesGrid } from "@/components/cities-grid";
import { QuoteMark } from "@/components/quote-mark";
import { db } from "@/db";
import { events, newsArticles, coverageCities, universities } from "@/db/schema";
import { publishDueEvents } from "@/lib/publish-events";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

// The nine cities PPIT Nanjing covers, for the home-page cities section. Copy
// for each lives under `home.city.<slug>.*`. Editorial order: Nanjing (the
// chapter seat) first, then the established branches, then the three smaller
// student groups (Lianyungang, Taizhou, Yancheng). The canonical list is the
// `coverage_cities` table; /coverage renders it alphabetically.
const CITIES = [
  { name: "Nanjing", slug: "nanjing" },
  { name: "Xuzhou", slug: "xuzhou" },
  { name: "Jurong", slug: "jurong" },
  { name: "Ma'anshan", slug: "manshan" },
  { name: "Zhenjiang", slug: "zhenjiang" },
  { name: "Huai'an", slug: "huaian" },
  { name: "Lianyungang", slug: "lianyungang" },
  { name: "Taizhou", slug: "taizhou" },
  { name: "Yancheng", slug: "yancheng" },
] as const;

export default async function Home() {
  await publishDueEvents();
  const { t, locale } = await getT();

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

  // Real figures for the stats band - see StatsGrid on why no headcount. The
  // campus count is filtered to published rows so it matches what a visitor can
  // actually see on /universities (that page filters the same way).
  const [[{ value: cityCount }], [{ value: campusCount }]] = await Promise.all([
    db.select({ value: count() }).from(coverageCities),
    db.select({ value: count() }).from(universities).where(eq(universities.published, true)),
  ]);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="relative w-full overflow-hidden bg-warm-cream border-b border-outline-variant">
        {/* 紫金山 Zijin Shan - the chapter's namesake mountain, drawn in the active
            palette's own neutrals as layered Jiangnan mist. This follows the
            theme (no inverting dark panel) and replaces the placeholder gradient
            hero; a licensed Nanjing photograph can take this slot later - see
            docs/Design System/Iconography & Imagery.md. Ridge paths are shared
            with the auth season panel. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 md:h-72" aria-hidden="true">
          <svg viewBox="0 0 400 150" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {/* one ink, three layers of receding mist */}
            <path d="M0,150 L0,102 C55,88 95,98 145,88 C195,78 235,92 285,82 C325,74 355,80 400,76 L400,150 Z" fill="var(--color-on-surface-variant)" opacity="0.09" />
            <path d="M0,150 L0,116 C60,98 105,110 155,98 C205,86 245,102 295,90 C335,80 365,88 400,84 L400,150 Z" fill="var(--color-on-surface-variant)" opacity="0.16" />
            <path d="M0,150 L0,130 C50,110 90,124 135,108 C165,98 190,84 218,86 C245,88 270,108 305,100 C340,92 370,98 400,104 L400,150 Z" fill="var(--color-on-surface-variant)" opacity="0.24" />
          </svg>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-muted-gold/50" aria-hidden="true" />

        <div className="relative z-10 max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-24 md:py-36 flex flex-col items-center text-center">
          <AnimatedHeroHeading
            words={t("home.hero.words").split("|")}
            className="text-display-hero-mobile md:text-display-hero text-on-background text-balance mb-6 max-w-4xl"
          />
          <AnimatedRevealText
            text={t("home.hero.subtext")}
            className="text-body-lg text-on-surface-variant text-pretty mb-[var(--spacing-stack-md)] max-w-2xl"
          />
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:bg-primary transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("home.hero.cta")} <MovingArrow size={18} />
            </Link>
            <Link
              href="/about"
              className="group inline-flex items-center gap-1.5 px-4 py-4 rounded-md text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("home.hero.ctaSecondary")} <MovingArrow size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex flex-col gap-16 md:gap-[var(--spacing-section-gap)] py-16 md:py-[var(--spacing-section-gap)]">
        {/* Stats */}
        <StatsGrid cityCount={cityCount} campusCount={campusCount} />

        {/* Quote */}
        <Reveal>
          <section className="flex justify-center">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(39,23,22,0.04)] max-w-4xl w-full p-10 md:p-16">
              <QuoteMark />
              <p className="text-quote-text text-on-surface italic mb-8">
                &ldquo;{t("home.quote.text")}&rdquo;
              </p>
              <p className="text-headline-md text-on-background mb-1">{t("home.quote.author")}</p>
              <p className="text-label-caps text-secondary uppercase">{t("home.quote.period")}</p>
            </div>
          </section>
        </Reveal>

        {/* Cities under PPIT Nanjing's umbrella */}
        <Reveal>
          <section className="flex flex-col gap-8">
            <SectionHeading
              kicker={t("home.cities.kicker")}
              title={t("home.cities.title")}
              description={t("home.cities.description")}
            />
            <CitiesGrid
              cities={CITIES.map((c) => ({
                name: c.name,
                blurb: t(`home.city.${c.slug}.blurb`),
                detail: t(`home.city.${c.slug}.detail`),
              }))}
            />
          </section>
        </Reveal>

        {/* Latest Events - honest empty state guides users when nothing is published yet */}
        <Reveal>
          <section className="flex flex-col gap-8">
            <SectionHeading kicker={t("home.events.kicker")} title={t("home.events.title")} href="/events" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestEvents.length > 0 ? (
                latestEvents.map((e) => (
                  <ContentCard
                    key={e.id}
                    href={`/events/${e.slug}`}
                    imageUrl={e.coverImageUrl}
                    eyebrow={e.category}
                    meta={e.startAt ? new Date(e.startAt).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "medium" }) : ""}
                    title={e.title}
                    excerpt={e.description}
                  />
                ))
              ) : (
                <EmptyState
                  icon="calendar"
                  title={t("home.empty.events.title")}
                  description={t("home.empty.events.desc")}
                  ctaHref="/events"
                  ctaLabel={t("home.empty.events.cta")}
                />
              )}
            </div>
          </section>
        </Reveal>

        {/* Latest News - same honesty rule, with a graceful empty state */}
        <Reveal>
          <section className="flex flex-col gap-8">
            <SectionHeading kicker={t("home.news.kicker")} title={t("home.news.title")} href="/news" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestNews.length > 0 ? (
                latestNews.map((a) => (
                  <ContentCard
                    key={a.id}
                    href={`/news/${a.slug}`}
                    imageUrl={a.coverImageUrl}
                    fallbackIcon="news"
                    metaIcon={false}
                    meta={a.publishedAt ? new Date(a.publishedAt).toLocaleDateString(INTL_LOCALE[locale]) : ""}
                    title={a.title}
                    excerpt={a.content}
                  />
                ))
              ) : (
                <EmptyState
                  icon="news"
                  title={t("home.empty.news.title")}
                  description={t("home.empty.news.desc")}
                  ctaHref="/news"
                  ctaLabel={t("home.empty.news.cta")}
                />
              )}
            </div>
          </section>
        </Reveal>
      </main>

      <SiteFooter />
    </div>
  );
}
