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
import { EmptyState } from "@/components/empty-state";
import { StatsGrid } from "@/components/stats-grid";
import { CitiesGrid } from "@/components/cities-grid";
import { QuoteMark } from "@/components/quote-mark";
import { db } from "@/db";
import { events, newsArticles } from "@/db/schema";
import { publishDueEvents } from "@/lib/publish-events";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

const CITIES = [
  { name: "Nanjing", slug: "nanjing" },
  { name: "Xuzhou", slug: "xuzhou" },
  { name: "Jurong", slug: "jurong" },
  { name: "Ma'anshan", slug: "manshan" },
  { name: "Zhenjiang", slug: "zhenjiang" },
  { name: "Huai'an", slug: "huaian" },
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
            words={t("home.hero.words").split("|")}
            className="text-display-hero-mobile md:text-display-hero text-on-primary mb-[var(--spacing-stack-md)]"
          />
          <AnimatedRevealText
            text={t("home.hero.subtext")}
            className="text-body-lg text-on-primary-container mb-[var(--spacing-stack-md)] max-w-2xl"
          />
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-on-primary text-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:scale-105 transition-transform motion-reduce:hover:scale-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-on-background"
          >
            {t("home.hero.cta")} <ArrowRight size={18} aria-hidden="true" />
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
