import { asc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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

  const allPublished = await db.select({ category: events.category }).from(events).where(eq(events.status, "published"));
  const categories = [...new Set(allPublished.map((e) => e.category).filter((c): c is string => !!c))];

  const now = new Date();
  const featured = list.find((e) => e.startAt && new Date(e.startAt) >= now) ?? null;
  const rest = featured ? list.filter((e) => e.id !== featured.id) : list;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-outline-variant">
        <div className="max-w-2xl">
          <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Kegiatan</h1>
          <p className="text-body-lg text-on-surface-variant">
            Ikuti kegiatan PPIT Nanjing dan daftar langsung lewat situs ini.
          </p>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <a
              href="/events"
              className={`px-5 py-2.5 rounded-lg text-label-caps uppercase tracking-wide transition-colors ${
                !category
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-lowest border border-outline-variant text-on-background hover:bg-surface-container-low"
              }`}
            >
              Semua
            </a>
            {categories.map((c) => (
              <a
                key={c}
                href={`/events?category=${encodeURIComponent(c)}`}
                className={`px-5 py-2.5 rounded-lg text-label-caps uppercase tracking-wide transition-colors ${
                  category === c
                    ? "bg-primary-container text-on-primary"
                    : "bg-surface-container-lowest border border-outline-variant text-on-background hover:bg-surface-container-low"
                }`}
              >
                {c}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        {list.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <CalendarX className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">
              {category ? "Belum ada kegiatan untuk kategori ini." : "Belum ada kegiatan yang dijadwalkan."}
            </p>
          </div>
        ) : (
          <>
            {featured && (
              <section>
                <h2 className="text-headline-lg text-on-background mb-6 flex items-center gap-2">
                  <Star className="text-primary-container" size={22} fill="currentColor" />
                  Kegiatan Mendatang
                </h2>
                <a
                  href={`/events/${featured.slug}`}
                  className="group grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
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
                          <CalendarDays size={16} /> {new Date(featured.startAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-headline-lg text-on-background mb-4 group-hover:text-primary-container transition-colors">
                      {featured.title}
                    </h3>
                    {featured.description && (
                      <p className="text-body-md text-on-surface-variant mb-8 line-clamp-3">{featured.description}</p>
                    )}
                    <div className="mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {featured.location && (
                        <span className="text-body-md text-secondary flex items-center gap-2">
                          <MapPin size={18} /> {featured.location}
                        </span>
                      )}
                      <span className="flex items-center gap-2 bg-primary-container text-on-primary px-6 py-3 rounded-lg text-label-caps uppercase tracking-wide group-hover:bg-primary transition-colors">
                        Daftar Sekarang <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </a>
              </section>
            )}

            {rest.length > 0 && (
              <section className="flex flex-col gap-8">
                <h2 className="text-headline-lg text-on-background border-b border-outline-variant pb-6">
                  {featured ? "Kegiatan Lainnya" : "Semua Kegiatan"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {rest.map((e) => {
                    const isPast = e.startAt ? new Date(e.startAt) < now : false;
                    return (
                      <a
                        key={e.id}
                        href={`/events/${e.slug}`}
                        className={`group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col ${
                          isPast ? "opacity-80 hover:opacity-100" : ""
                        }`}
                      >
                        <div className="h-44 bg-surface-container-low overflow-hidden relative">
                          {isPast && (
                            <span className="absolute top-3 left-3 z-10 bg-surface-container-lowest text-on-background px-3 py-1.5 rounded-lg text-label-caps font-bold tracking-widest shadow-sm">
                              SELESAI
                            </span>
                          )}
                          {e.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={e.coverImageUrl}
                              alt={e.title}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isPast ? "grayscale group-hover:grayscale-0" : ""}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CalendarDays className="text-outline-variant" size={32} />
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          {e.category && (
                            <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2">
                              {e.category}
                            </span>
                          )}
                          <h2 className="text-headline-md text-on-background mb-3">{e.title}</h2>
                          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant mt-auto">
                            {e.startAt && (
                              <span className="flex items-center gap-1.5">
                                <CalendarDays size={14} /> {new Date(e.startAt).toLocaleDateString("id-ID")}
                              </span>
                            )}
                            {e.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin size={14} /> {e.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
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
