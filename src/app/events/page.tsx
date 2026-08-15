import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CalendarDays, MapPin, CalendarX } from "lucide-react";

export default async function EventsPage() {
  const list = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(asc(events.startAt));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Kegiatan</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Ikuti kegiatan PPIT Nanjing dan daftar langsung lewat situs ini.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {list.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <CalendarX className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">Belum ada kegiatan yang dijadwalkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {list.map((e) => (
              <a
                key={e.id}
                href={`/events/${e.slug}`}
                className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col"
              >
                <div className="h-44 bg-surface-container-low overflow-hidden">
                  {e.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.coverImageUrl}
                      alt={e.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
