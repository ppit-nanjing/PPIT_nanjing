import { eq, and, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CalendarDays, MapPin, Users, Ticket } from "lucide-react";
import { registerForEvent } from "@/app/actions/events";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();

  const [{ value: registeredCount }] = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, event.id));

  const session = await auth();
  let alreadyRegistered = false;
  if (session?.user?.id) {
    const [existing] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, session.user.id)));
    alreadyRegistered = !!existing;
  }

  const isFull = event.capacity != null && registeredCount >= event.capacity;
  const canRegister = event.status === "published" && !isFull;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        {event.category && (
          <span className="text-label-caps uppercase tracking-wide text-primary-container mb-3 block">
            {event.category}
          </span>
        )}
        <h1 className="text-headline-lg text-on-background mb-6">{event.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-md text-on-surface-variant mb-8">
          {event.startAt && (
            <span className="flex items-center gap-2">
              <CalendarDays size={18} />
              {new Date(event.startAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-2">
              <MapPin size={18} /> {event.location}
            </span>
          )}
          <span className="flex items-center gap-2">
            <Users size={18} /> {registeredCount}
            {event.capacity ? ` / ${event.capacity}` : ""} terdaftar
          </span>
        </div>

        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt={event.title} className="w-full rounded-xl mb-8 object-cover" />
        )}

        {event.description && (
          <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">{event.description}</p>
        )}

        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8">
          {alreadyRegistered ? (
            <a
              href={`/events/${slug}/ticket`}
              className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:bg-primary transition-colors"
            >
              <Ticket size={18} /> Lihat Tiket Saya
            </a>
          ) : canRegister ? (
            <form action={registerForEvent.bind(null, event.id, slug)}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-8 py-4 rounded-md hover:bg-primary transition-colors"
              >
                Daftar Sekarang
              </button>
            </form>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              {isFull ? "Pendaftaran sudah penuh." : "Pendaftaran untuk kegiatan ini belum/tidak dibuka."}
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
