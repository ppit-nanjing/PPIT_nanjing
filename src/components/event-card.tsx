import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { CalendarDays, MapPin, CalendarX } from "lucide-react";

export type EventCardEvent = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  startAt: Date | null;
  location: string | null;
  description?: string | null;
};

/**
 * Event card for the /events listing and the detail page's "Kegiatan
 * Lainnya" rail. Wrapped in <Reveal> for a staggered scroll-in, with a
 * hover lift, cover zoom, and an optional "SELESAI" badge + grayscale
 * treatment for past events.
 */
export function EventCard({
  event,
  isPast = false,
  index = 0,
}: {
  event: EventCardEvent;
  isPast?: boolean;
  index?: number;
}) {
  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/events/${event.slug}`}
        className="group relative block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
      >
        <div className="h-44 bg-surface-container-low overflow-hidden relative">
          {isPast && (
            <span className="absolute top-3 left-3 z-10 bg-surface-container-lowest text-on-background px-3 py-1.5 rounded-lg text-label-caps font-bold tracking-widest shadow-sm">
              SELESAI
            </span>
          )}
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                isPast ? "grayscale group-hover:grayscale-0" : ""
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarX className="text-outline-variant" size={32} />
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          {event.category && (
            <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2">
              {event.category}
            </span>
          )}
          <h3 className="text-headline-md text-on-background mb-3 group-hover:text-primary-container transition-colors">
            {event.title}
          </h3>
          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant mt-auto">
            {event.startAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} /> {new Date(event.startAt).toLocaleDateString("id-ID")}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {event.location}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
