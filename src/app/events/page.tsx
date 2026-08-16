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
import { CalendarDays, MapPin, CalendarX, Star, ArrowRight } from "lucide-react";

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
            <div className="flex flex-col items-center text-center py-24">
              <CalendarX className="text-outline-variant mb-4" size={40} />
              <p className="text-body-md text-on-surface-variant">
                {category ? "Belum ada kegiatan untuk kategori ini." : "Belum ada kegiatan yang dijadwalkan."}
              </p>
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
                    className="group grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="lg:col-span-7 h-64 lg:h-auto relative overflow-hidden bg-surface-container-low">
                      {featured.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={featured.coverImageUrl}
                          alt={featured.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 absolute inset-0"
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
                            <CalendarDays size={16} />{" "}
                            {new Date(featured.startAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
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
                        <span className="flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-lg text-label-caps uppercase tracking-wide group-hover:bg-primary transition-colors">
                          Daftar Sekarang{" "}
                          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
