import { asc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { Reveal } from "@/components/reveal";
import { FilterTabs } from "@/components/filter-tabs";
import { EventCard } from "@/components/event-card";
import { CalendarDays, MapPin, CalendarX, Star, ArrowRight, CalendarPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const conditions = [eq(events.status, "published")];
  if (category) conditions.push(eq(events.category, category));

  const list = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.startAt));

  const allPublished = await db
    .select({ category: events.category })
    .from(events)
    .where(eq(events.status, "published"));
  const categories = [
    ...new Set(allPublished.map((e) => e.category).filter((c): c is string => !!c)),
  ];

  const filterOptions = [
    { key: "all", label: "Semua", href: "/events", active: !category },
    ...categories.map((c) => ({
      key: c,
      label: c,
      href: `/events?category=${encodeURIComponent(c)}`,
      active: category === c,
    })),
  ];

  const now = new Date();
  const featured = list.find((e) => e.startAt && new Date(e.startAt) >= now) ?? null;
  const rest = featured ? list.filter((e) => e.id !== featured.id) : list;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-outline-variant">
        <div className="max-w-2xl">
          <AnimatedHeroHeading
            words={["Kegiatan"]}
            className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
          />
          <AnimatedRevealText text="Ikuti kegiatan PPIT Nanjing dan daftar langsung lewat situs ini." />
        </div>
        {categories.length > 0 && <FilterTabs options={filterOptions} layoutId="events-filter-pill" />}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        {list.length === 0 ? (
          <Reveal>
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center text-center py-24 px-6 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl"
            >
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-5">
                <CalendarX className="text-outline-variant" size={32} aria-hidden="true" />
              </div>
              <h2 className="text-headline-md text-on-background mb-2">
                {category ? "Belum ada kegiatan di kategori ini" : "Belum ada kegiatan yang dijadwalkan"}
              </h2>
              <p className="text-body-md text-on-surface-variant mb-6 max-w-md">
                {category
                  ? "Coba kategori lain atau lihat seluruh kegiatan PPIT Nanjing."
                  : "Pantau terus situs ini — kegiatan baru akan muncul di sini."}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <CalendarPlus size={16} aria-hidden="true" /> Lihat Semua Kegiatan
              </Link>
            </div>
          </Reveal>
        ) : (
          <>
            {featured && (
              <section>
                <Reveal>
                  <h2 className="text-headline-lg text-on-background mb-6 flex items-center gap-2">
                    <Star className="text-primary-container" size={22} fill="currentColor" />
                    Kegiatan Mendatang
                  </h2>
                  <a
                    href={`/events/${featured.slug}`}
                    aria-label={`Lihat detail kegiatan ${featured.title}`}
                    className="group grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 motion-reduce:transform-none motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="lg:col-span-7 h-64 lg:h-auto relative overflow-hidden bg-surface-container-low">
                      {featured.coverImageUrl ? (
                        <Image
                          src={featured.coverImageUrl}
                          alt={featured.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 58vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700 motion-reduce:transform-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays className="text-outline-variant" size={40} />
                        </div>
                      )}
                      <span className="absolute top-6 left-6 bg-primary-container text-on-primary px-4 py-2 rounded-lg text-label-caps uppercase tracking-wide shadow-md">
                        Mendatang
                      </span>
                    </div>
                    <div className="lg:col-span-5 p-10 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        {featured.category && (
                          <span className="px-3 py-1.5 bg-outline text-on-primary text-label-caps uppercase rounded-lg">
                            {featured.category}
                          </span>
                        )}
                        {featured.startAt && (
                          <span className="text-body-md text-secondary flex items-center gap-1.5">
                            <CalendarDays size={16} aria-hidden="true" />{" "}
                            {new Date(featured.startAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                            {(() => {
                              const d = new Date(featured.startAt);
                              return d.getHours() !== 0 || d.getMinutes() !== 0
                                ? ` · ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                                : null;
                            })()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-headline-lg text-on-background mb-4 group-hover:text-primary-container transition-colors">
                        {featured.title}
                      </h3>
                      {featured.description && (
                        <p className="text-body-md text-on-surface-variant mb-8 line-clamp-3">
                          {featured.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {featured.location && (
                          <span className="text-body-md text-secondary flex items-center gap-2">
                            <MapPin size={18} /> {featured.location}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-lg text-label-caps uppercase tracking-wide group-hover:bg-primary transition-colors"
                        >
                          Daftar Sekarang{" "}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform motion-reduce:transform-none" />
                        </span>
                      </div>
                    </div>
                  </a>
                </Reveal>
              </section>
            )}

            {rest.length > 0 && (
              <section className="flex flex-col gap-8">
                <Reveal>
                  <h2 className="text-headline-lg text-on-background border-b border-outline-variant pb-6">
                    {featured ? "Kegiatan Lainnya" : "Semua Kegiatan"}
                  </h2>
                </Reveal>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((e, i) => (
                    <EventCard
                      key={e.id}
                      index={i}
                      isPast={e.startAt ? new Date(e.startAt) < now : false}
                      event={{
                        id: e.id,
                        slug: e.slug,
                        title: e.title,
                        coverImageUrl: e.coverImageUrl,
                        category: e.category,
                        startAt: e.startAt,
                        location: e.location,
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
