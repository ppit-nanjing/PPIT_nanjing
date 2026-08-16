import { eq, and, ne, count, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { EventCard } from "@/components/event-card";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CalendarDays, MapPin, Users, Ticket, ArrowLeft, ListChecks, Images, ArrowRight } from "lucide-react";
import Image from "next/image";
import { registerForEvent } from "@/app/actions/events";
import Link from "next/link";

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
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Kegiatan
        </Link>

        {event.coverImageUrl && (
          <Reveal>
            <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <Image
                src={event.coverImageUrl}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
          </Reveal>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {event.category && (
              <span className="text-label-caps uppercase tracking-wide text-primary-container mb-3 block">
                {event.category}
              </span>
            )}
            {event.requiresSensus && (
              <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-primary-container px-2.5 py-1 rounded mb-3 block w-fit">
                Khusus peserta tersensus
              </span>
            )}
            <AnimatedHeroHeading
              words={event.title.split(" ")}
              className="text-display-hero-mobile md:text-display-hero text-on-background mb-6 leading-tight"
            />

            {event.description && (
              <Reveal>
                <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">
                  {event.description}
                </p>
              </Reveal>
            )}

            {agendaItems.length > 0 && (
              <Reveal>
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
              </Reveal>
            )}

            {photos.length > 0 && (
              <Reveal>
                <section className="mb-10">
                  <h2 className="text-headline-md text-on-background mb-6 flex items-center gap-2">
                    <Images className="text-primary-container" size={20} /> Galeri
                  </h2>
                  <GalleryLightbox
                    photos={photos.map((p) => ({
                      id: p.id,
                      imageUrl: p.imageUrl,
                      caption: p.caption ?? null,
                    }))}
                  />
                  {album && (
                    <a
                      href={`/gallery/${album.id}`}
                      className="inline-flex items-center gap-1 text-label-caps uppercase text-primary-container hover:text-primary transition-colors mt-4"
                    >
                      Lihat Album Lengkap <ArrowRight size={14} />
                    </a>
                  )}
                </section>
              </Reveal>
            )}
          </div>

          <div className="lg:col-span-4">
            <Reveal>
              <div className="sticky top-24 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-5">
                {event.startAt && (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="text-primary-container shrink-0 mt-0.5" size={18} aria-hidden="true" />
                    <div>
                      <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">Tanggal & Waktu</p>
                      <p className="text-body-md text-on-background font-semibold">
                        {new Date(event.startAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
                      </p>
                      {(() => {
                        const start = new Date(event.startAt);
                        const startTime =
                          start.getHours() !== 0 || start.getMinutes() !== 0
                            ? start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                            : null;
                        const endTime =
                          event.endAt &&
                          (new Date(event.endAt).getHours() !== 0 || new Date(event.endAt).getMinutes() !== 0)
                            ? new Date(event.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                            : null;
                        if (!startTime && !endTime) return null;
                        return (
                          <p className="text-body-sm text-on-surface-variant">
                            {startTime ?? "—"}
                            {endTime ? ` – ${endTime}` : ""}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="text-primary-container shrink-0 mt-0.5" size={18} aria-hidden="true" />
                    <div>
                      <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">Lokasi</p>
                      <p className="text-body-md text-on-background font-semibold">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Users className="text-primary-container shrink-0 mt-0.5" size={18} aria-hidden="true" />
                  <div className="flex-1">
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
                    {event.capacity != null && (
                      <div
                        className="mt-2 h-2 w-full rounded-full bg-surface-container-low overflow-hidden"
                        role="progressbar"
                        aria-label="Kapasitas pendaftaran"
                        aria-valuemin={0}
                        aria-valuemax={event.capacity}
                        aria-valuenow={Math.min(registeredCount, event.capacity)}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
                            isFull ? "bg-error" : "bg-primary-container"
                          }`}
                          style={{ width: `${Math.min(100, (registeredCount / event.capacity) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {event.registrationDeadline && (
                  <p className="text-label-caps text-on-surface-variant">
                    Pendaftaran ditutup{" "}
                    {new Date(event.registrationDeadline).toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                )}

                <div className="border-t border-outline-variant pt-5" role="status" aria-live="polite">
                  {event.requiresSensus && !alreadyRegistered && (
                    <>
                      <p className="text-label-caps text-on-surface-variant mb-3 text-center">
                        Event ini hanya untuk peserta yang sudah lengkap mengisi sensus.
                      </p>
                      <p className="text-body-md text-on-surface-variant text-center mb-4">
                        Lengkapi data sensus untuk mendaftar — kamu akan kembali ke halaman ini.
                      </p>
                      <Link
                        href={`/sensus?returnTo=${encodeURIComponent(`/events/${slug}`)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                      >
                        <ListChecks size={18} aria-hidden="true" /> Isi Sensus untuk Daftar
                      </Link>
                    </>
                  )}
                  {alreadyRegistered ? (
                    <a
                      href={`/events/${slug}/ticket`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                    >
                      <Ticket size={18} aria-hidden="true" /> Lihat Tiket Saya
                    </a>
                  ) : canRegister ? (
                    session?.user?.id ? (
                      <form action={registerForEvent.bind(null, event.id, slug)}>
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                        >
                          <Ticket size={18} aria-hidden="true" /> Daftar Sekarang
                        </button>
                      </form>
                    ) : (
                      <Link
                        href={`/login?returnTo=${encodeURIComponent(`/events/${slug}`)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                      >
                        <ArrowRight size={18} aria-hidden="true" /> Masuk untuk Daftar
                      </Link>
                    )
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-body-md text-on-surface-variant text-center bg-surface-container-low rounded-md px-4 py-3">
                      {isFull ? (
                        <>
                          <Users size={16} aria-hidden="true" /> Pendaftaran sudah penuh.
                        </>
                      ) : deadlinePassed ? (
                        <>
                          <CalendarX size={16} aria-hidden="true" /> Batas waktu pendaftaran sudah lewat.
                        </>
                      ) : (
                        "Pendaftaran untuk kegiatan ini belum/tidak dibuka."
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-outline-variant">
            <Reveal>
              <h2 className="text-headline-lg text-on-background mb-8">Kegiatan Lainnya</h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((e, i) => (
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
      </main>

      <SiteFooter />
    </div>
  );
}
