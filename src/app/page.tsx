import { eq, desc, inArray, count } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
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
import { QuoteCard } from "@/components/quote-card";
import { PhotoFrame } from "@/components/photo-frame";
import kabinetPhoto from "@/assets/images/kabinet-ppit-nanjing.webp";
import { Sunburst } from "@/components/deco/sunburst";
import { PlumBlossoms, PlumSymbols } from "@/components/deco/plum-blossoms";
import { DecoRule } from "@/components/deco/deco-rule";
import { SiteIntro } from "@/components/site-intro";
import { db } from "@/db";
import { events, newsArticles, coverageCities, universities } from "@/db/schema";
import { publishDueEvents } from "@/lib/publish-events";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

// The nine cities PPIT Nanjing covers, for the home-page cities section. Copy
// for each lives under `home.city.<slug>.*`. Display order: Nanjing (the
// chapter seat) first, then the rest alphabetically - the same order as
// src/lib/coverage-cities.ts, shared by the sensus dropdown, /coverage, and
// the console filters. The canonical list itself is the `coverage_cities`
// table. (`manshan` below is the i18n key for Ma'anshan; the DB/geo slug is
// `maanshan`.) `hanzi` is the city's Chinese name, shown under the Latin one.
// A fixed 3-column grid leaves a bare empty cell whenever fewer than 3 items
// are published (a near-certainty early on, and visible right now with only
// 2 live events) - reads as an unfinished template rather than a deliberate
// layout. Capping columns to the actual count and centering keeps a short
// row looking intentional.
function cardGridClass(count: number) {
  if (count === 1) return "grid grid-cols-1 gap-3 sm:gap-8 max-w-md mx-auto";
  if (count === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 max-w-3xl mx-auto";
  return "grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8";
}

const CITIES = [
  { name: "Nanjing", hanzi: "南京", slug: "nanjing" },
  { name: "Huai'an", hanzi: "淮安", slug: "huaian" },
  { name: "Jurong", hanzi: "句容", slug: "jurong" },
  { name: "Lianyungang", hanzi: "连云港", slug: "lianyungang" },
  { name: "Ma'anshan", hanzi: "马鞍山", slug: "manshan" },
  { name: "Taizhou", hanzi: "泰州", slug: "taizhou" },
  { name: "Xuzhou", hanzi: "徐州", slug: "xuzhou" },
  { name: "Yancheng", hanzi: "盐城", slug: "yancheng" },
  { name: "Zhenjiang", hanzi: "镇江", slug: "zhenjiang" },
] as const;

const CONTAINER = "max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)]";

export default async function Home() {
  await publishDueEvents();
  const { t, locale } = await getT();

  // The hero otherwise only ever addresses a first-time visitor - PRODUCT.md
  // calls the newcomer and the returning member "equal weight" and names
  // census completeness as one of only two term-level success metrics, so a
  // signed-in member with an incomplete census gets that as their secondary
  // CTA instead of "About PPIT Nanjing" (which they've already seen). Signed
  // out visitors and members who've already finished their census see the
  // page exactly as before - this only swaps one link's target+label.
  const session = await auth();
  const needsCensus = session?.user?.id ? !(await hasCompletedSensus(session.user.id)) : false;

  // "Kegiatan Terbaru" memuat acara mendatang DAN yang baru selesai (WIF,
  // Fun Hike, dst) - kalau hanya `published`, acara hilang begitu ditandai
  // selesai. Urutan: mendatang terdekat dulu, lalu yang paling baru selesai.
  const eventRows = await db
    .select()
    .from(events)
    .where(inArray(events.status, ["published", "registration_closed", "completed"]));
  const eventStartMs = (e: (typeof eventRows)[number]) =>
    e.startAt ? new Date(e.startAt).getTime() : Number.POSITIVE_INFINITY;
  const homeNow = new Date().getTime();
  const latestEvents = [
    ...eventRows.filter((e) => eventStartMs(e) >= homeNow).sort((a, b) => eventStartMs(a) - eventStartMs(b)),
    ...eventRows.filter((e) => eventStartMs(e) < homeNow).sort((a, b) => eventStartMs(b) - eventStartMs(a)),
  ].slice(0, 3);
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
      <SiteIntro />
      {/* Defines the shared plum-blossom <symbol>s used by the hero, the About band
          and the quote card. Render once per page. */}
      <PlumSymbols />
      <SiteNav />

      <header className="relative w-full overflow-hidden bg-warm-cream">
        {/* Art Deco sunburst + drifting plum blossoms (梅花, the city flower). Both are
            decoration under the content (z-10) and stand still under reduced motion. */}
        <Sunburst />
        <PlumBlossoms variant="hero" />

        {/* The global Help & Feedback launcher is fixed at bottom-24 (+ ~54px)
            on narrow viewports, which lands right on top of this hero's own
            subtext on SHORT narrow phones (confirmed at 360x640: subtext
            bottom sat at y518, launcher top at y490 - a real ~28px overlap,
            not a screenshot artifact). It only reproduces when width AND
            height are both small (a 375x812 "mobile" phone has the same
            width tier but is tall enough to clear it), so the tighter rhythm
            below, and dropping the eyebrow + divider, is gated on both, not
            just the mobile width tier - taller-but-narrow phones keep the
            normal py-24 spacing.

            From md up the hero is sized to the SCREEN, not to a fixed 144px of
            padding: a 1920x1080 laptop at 125% Windows scaling is only ~1536x700
            CSS px, and the old fixed padding pushed the main CTA to y=714, below
            the fold, while the same hero floated in a 100% monitor. Now the
            vertical padding follows the viewport height (7vh, 40-128px) and the
            hero is at least one screen tall (capped at 52rem) with its content
            centred, so the CTA stays visible on short laptops and the hero still
            fills a tall monitor. */}
        <div className="relative z-10 max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-24 md:py-[clamp(2.5rem,7vh,8rem)] md:min-h-[min(calc(100svh-4.75rem),52rem)] md:justify-center [@media(max-width:639px)_and_(max-height:700px)]:pt-10 flex flex-col items-center text-center">
          <DecoRule className="mb-6 [@media(max-width:639px)_and_(max-height:700px)]:hidden" />
          <p className="text-label-caps uppercase tracking-[0.34em] text-gold-ink mb-4 text-balance [@media(max-width:639px)_and_(max-height:700px)]:hidden">
            {t("home.hero.eyebrow")}
          </p>
          <AnimatedHeroHeading
            words={t("home.hero.words").split("|")}
            accentLast
            className="text-display-hero-mobile md:text-display-hero text-heading text-balance mb-6 [@media(max-width:639px)_and_(max-height:700px)]:mb-3 max-w-4xl"
          />
          <AnimatedRevealText
            text={t("home.hero.subtext")}
            className="text-body-lg text-on-surface-variant text-pretty mb-[var(--spacing-stack-md)] max-w-2xl"
          />
          <div className="deco-cartouche mb-10 [@media(max-width:639px)_and_(max-height:700px)]:hidden">
            <p className="text-label-caps md:text-[15px] uppercase tracking-[0.28em] text-heading">{t("home.hero.motto")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <Link
              href="/events"
              className="deco-btn group inline-flex items-center gap-2 bg-accent text-on-accent text-label-caps uppercase px-8 py-4 rounded-md hover:brightness-95 transition-[filter] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("home.hero.cta")} <MovingArrow size={18} />
            </Link>
            <Link
              href={needsCensus ? "/sensus" : "/about"}
              className="group inline-flex items-center gap-1.5 px-4 py-4 rounded-md text-label-caps uppercase text-primary-container hover:text-primary transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {needsCensus ? t("home.hero.ctaCensus") : t("home.hero.ctaSecondary")} <MovingArrow size={16} />
            </Link>
          </div>
        </div>
      </header>
      <div className="deco-foil" aria-hidden="true" />

      <main>
        {/* Stats */}
        <div className={`${CONTAINER} py-8 md:py-24`}>
          <StatsGrid cityCount={cityCount} campusCount={campusCount} />
        </div>

        {/* About: the dark Deco band, with the leadership quote */}
        <section className="relative overflow-hidden bg-band text-on-band">
          <div className="deco-lattice" aria-hidden="true" />
          <PlumBlossoms variant="band" />
          <div className={`${CONTAINER} relative z-10 py-10 md:py-[var(--spacing-section-gap)] flex flex-col gap-8 md:gap-16`}>
            <Reveal>
              <SectionHeading tone="band" kicker={t("about.kicker")} title={t("home.about.title")} description={t("home.about.lead")} />
            </Reveal>
            <Reveal>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
                <div className="flex flex-col gap-4 text-body-md text-on-band-muted text-pretty">
                  <p>{t("about.intro")}</p>
                  <p>{t("about.coverageText")}</p>
                </div>
                <QuoteCard text={t("home.quote.text")} author={t("home.quote.author")} period={t("home.quote.period")} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* The family: cabinet photo in an arch frame */}
        <section className="bg-surface-container border-y border-outline-variant">
          <div className={`${CONTAINER} py-10 md:py-[var(--spacing-section-gap)] flex flex-col gap-8 md:gap-16`}>
            <Reveal>
              <SectionHeading kicker={t("home.family.kicker")} title={t("home.family.title")} description={t("home.family.desc")} />
            </Reveal>
            <Reveal>
              <PhotoFrame
                image={kabinetPhoto}
                alt={t("home.family.alt")}
                caption={t("home.family.caption")}
                note={t("home.family.note")}
              />
            </Reveal>
          </div>
        </section>

        <div className={`${CONTAINER} flex flex-col gap-10 md:gap-[var(--spacing-section-gap)] py-10 md:py-[var(--spacing-section-gap)]`}>
          {/* Cities under PPIT Nanjing's umbrella */}
          <Reveal>
            <section className="flex flex-col gap-6 sm:gap-10">
              <SectionHeading
                kicker={t("home.cities.kicker")}
                title={t("home.cities.title")}
                description={t("home.cities.description")}
              />
              <CitiesGrid
                cities={CITIES.map((c) => ({
                  name: c.name,
                  hanzi: c.hanzi,
                  blurb: t(`home.city.${c.slug}.blurb`),
                  detail: t(`home.city.${c.slug}.detail`),
                  isHq: c.slug === "nanjing",
                }))}
              />
            </section>
          </Reveal>

          {/* Latest Events - honest empty state guides users when nothing is published yet */}
          <Reveal>
            <section className="flex flex-col gap-6 sm:gap-10">
              <SectionHeading kicker={t("home.events.kicker")} title={t("home.events.title")} href="/events" />
              <div className={latestEvents.length > 0 ? cardGridClass(latestEvents.length) : "grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8"}>
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
            <section className="flex flex-col gap-6 sm:gap-10">
              <SectionHeading kicker={t("home.news.kicker")} title={t("home.news.title")} href="/news" />
              <div className={latestNews.length > 0 ? cardGridClass(latestNews.length) : "grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8"}>
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
