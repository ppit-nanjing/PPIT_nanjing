import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { CalendarDays, MapPin, CalendarX, Clock, ArrowRight } from "lucide-react";

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
  const date = event.startAt ? new Date(event.startAt) : null;
  const hasTime = date ? date.getHours() !== 0 || date.getMinutes() !== 0 : false;
  const timeLabel = date
    ? date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/events/${event.slug}`}
        aria-label={`Lihat detail kegiatan ${event.title}`}
        className="group relative block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background flex flex-col"
      >
        <div className="h-44 bg-surface-container-low overflow-hidden relative">
          {isPast && (
            <span className="absolute top-3 left-3 z-10 bg-surface-container-lowest text-on-background px-3 py-1.5 rounded-lg text-label-caps font-bold tracking-widest shadow-sm">
              SELESAI
            </span>
          )}
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 33vw"
              className={`object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none ${
                isPast ? "grayscale group-hover:grayscale-0" : ""
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
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
          <h3 className="text-headline-md text-on-background mb-3 group-hover:text-primary-container transition-colors flex items-start gap-1.5">
            <span className="flex-1">{event.title}</span>
            <ArrowRight
              size={18}
              aria-hidden="true"
              className="shrink-0 mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100"
            />
          </h3>
          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant mt-auto">
            {date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" />{" "}
                {date.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {hasTime && (
                  <>
                    {" · "}
                    <Clock size={13} aria-hidden="true" /> {timeLabel}
                  </>
                )}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> {event.location}
              </span>
            )}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
