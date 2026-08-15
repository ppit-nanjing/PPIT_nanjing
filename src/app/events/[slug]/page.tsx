import { eq, and, ne, count, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CalendarDays, MapPin, Users, Ticket, ArrowLeft, ListChecks, Images, ArrowRight } from "lucide-react";
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

  const now = new Date();
  const deadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < now : false;
  const isFull = event.capacity != null && registeredCount >= event.capacity;
  const canRegister = event.status === "published" && !isFull && !deadlinePassed;

  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.eventId, event.id));
  const photos = album
    ? await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, album.id)).limit(4)
    : [];

  const related = await db
    .select()
    .from(events)
    .where(and(eq(events.status, "published"), ne(events.id, event.id)))
    .orderBy(desc(events.startAt))
    .limit(3);

  const agendaItems = event.agenda
    ? event.agenda.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-10">
        <a
          href="/events"
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Kembali ke Kegiatan
        </a>

        {event.coverImageUrl && (
          <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {event.category && (
              <span className="text-label-caps uppercase tracking-wide text-primary-container mb-3 block">
                {event.category}
              </span>
            )}
            <h1 className="text-headline-lg text-on-background mb-6">{event.title}</h1>

            {event.description && (
              <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">{event.description}</p>
            )}

            {agendaItems.length > 0 && (
              <section className="mb-10">
                <h2 className="text-headline-md text-on-background mb-6 flex items-center gap-2">
                  <ListChecks className="text-primary-container" size={20} /> Agenda Acara
                </h2>
                <ul className="flex flex-col gap-4">
                  {agendaItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 border-l-2 border-primary-container pl-4">
                      <span className="text-body-md text-on-background">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {photos.length > 0 && (
              <section className="mb-10">
                <h2 className="text-headline-md text-on-background mb-6 flex items-center gap-2">
                  <Images className="text-primary-container" size={20} /> Galeri
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.imageUrl}
                      alt={p.caption ?? event.title}
                      className="w-full h-40 object-cover rounded-lg border border-outline-variant"
                    />
                  ))}
                </div>
                {album && (
                  <a
                    href={`/gallery/${album.id}`}
                    className="inline-flex items-center gap-1 text-label-caps uppercase text-primary-container hover:text-primary transition-colors mt-4"
                  >
                    Lihat Album Lengkap <ArrowRight size={14} />
                  </a>
                )}
              </section>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-5">
              {event.startAt && (
                <div className="flex items-start gap-3">
                  <CalendarDays className="text-primary-container shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">Tanggal</p>
                    <p className="text-body-md text-on-background font-semibold">
                      {new Date(event.startAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
                    </p>
                  </div>
                </div>
              )}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-primary-container shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">Lokasi</p>
                    <p className="text-body-md text-on-background font-semibold">{event.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Users className="text-primary-container shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">Peserta</p>
                  <p className="text-body-md text-on-background font-semibold">
                    {registeredCount}
                    {event.capacity ? ` / ${event.capacity}` : ""} terdaftar
                  </p>
                  {event.capacity != null && !isFull && (
                    <p className="text-label-caps text-primary-container mt-0.5">
                      Sisa {event.capacity - registeredCount} slot
                    </p>
                  )}
                </div>
              </div>
              {event.registrationDeadline && (
                <p className="text-label-caps text-on-surface-variant">
                  Pendaftaran ditutup{" "}
                  {new Date(event.registrationDeadline).toLocaleDateString("id-ID", { dateStyle: "long" })}
                </p>
              )}

              <div className="border-t border-outline-variant pt-5">
                {alreadyRegistered ? (
                  <a
                    href={`/events/${slug}/ticket`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors"
                  >
                    <Ticket size={18} /> Lihat Tiket Saya
                  </a>
                ) : canRegister ? (
                  <form action={registerForEvent.bind(null, event.id, slug)}>
                    <button
                      type="submit"
                      className="w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors"
                    >
                      Daftar Sekarang
                    </button>
                  </form>
                ) : (
                  <p className="text-body-md text-on-surface-variant text-center">
                    {isFull
                      ? "Pendaftaran sudah penuh."
                      : deadlinePassed
                        ? "Batas waktu pendaftaran sudah lewat."
                        : "Pendaftaran untuk kegiatan ini belum/tidak dibuka."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-outline-variant">
            <h2 className="text-headline-lg text-on-background mb-8">Kegiatan Lainnya</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((e) => (
                <a
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col"
                >
                  <div className="h-36 bg-surface-container-low overflow-hidden">
                    {e.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.coverImageUrl}
                        alt={e.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CalendarDays className="text-outline-variant" size={28} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-body-md font-semibold text-on-background mb-2 group-hover:text-primary-container transition-colors">
                      {e.title}
                    </h3>
                    {e.startAt && (
                      <span className="flex items-center gap-1.5 text-label-caps text-on-surface-variant">
                        <CalendarDays size={13} /> {new Date(e.startAt).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
