import { eq, and, ne, count, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventDivisions, eventCommittee, galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { EventCard } from "@/components/event-card";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CalendarDays, MapPin, Users, Ticket, ArrowLeft, ListChecks, Images, ArrowRight, CalendarX, PartyPopper, BadgeCheck, PlayCircle, FolderOpen } from "lucide-react";
import Image from "next/image";
import { Select } from "@/components/console/form";
import { EventThemeStyle } from "@/components/events/event-theme-style";
import Link from "next/link";
import { applyAsVolunteer } from "@/app/actions/volunteers";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

const COMMITTEE_ROLE_LABEL: Record<string, string> = {
  ketua: "Ketua",
  wakil: "Wakil",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  supervisor: "Supervisor",
  humas: "Humas",
  acara: "Acara",
  logistik: "Logistik",
  dokumentasi: "Dokumentasi",
  anggota: "Anggota",
};

export default async function EventDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ volunteer?: string }> }) {
  const { slug } = await params;
  const { volunteer: volunteerFlag } = await searchParams;
  const { t, locale } = await getT();
  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();
  // Belum dirilis = tidak bisa dijangkau dari sisi publik.
  //
  // `draft` ikut ditambahkan 2026-08-21. Sebelumnya hanya `scheduled` yang
  // diblokir, padahal draft justru yang belum pernah siap tampil: acara draft
  // memang tidak terdaftar di /events, beranda, atau pencarian (semuanya
  // memfilter status "published"), tapi halamannya tetap terbuka bagi siapa pun
  // yang tahu URL-nya, lengkap dengan judul, tanggal, dan lokasi. Slug-nya
  // berakhiran acak jadi praktis tak tertebak, tapi itu ketidakcocokan, bukan
  // penjagaan.
  if (event.status === "scheduled" || event.status === "draft") notFound();

  const [{ value: registeredCount }] = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, event.id));

  const session = await auth();
  let alreadyRegistered = false;
  // Penugasan panitia pengunjung ini pada acara yang sama - kalau ada, form
  // volunteer diganti pemberitahuan + tautan tiket kepanitiaan (QR absensi).
  let myCommitteeRole: { divisionName: string | null; role: string } | null = null;
  if (session?.user?.id) {
    const [existing] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, session.user.id)));
    alreadyRegistered = !!existing;
    const [committee] = await db
      .select({ divisionName: eventDivisions.name, role: eventCommittee.role })
      .from(eventCommittee)
      .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
      .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, session.user.id)))
      .limit(1);
    if (committee) myCommitteeRole = { divisionName: committee.divisionName, role: committee.role };
  }

  const now = new Date();
  const deadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < now : false;
  const isFull = event.capacity != null && registeredCount >= event.capacity;
  const canRegister = event.status === "published" && !isFull && !deadlinePassed;

  // Wajah pasca-acara: dipicu status "completed" ATAU tanggal mulai sudah lewat
  // (halaman daftar acara juga pakai startAt < now, jadi kartu "lampau" tidak
  // lagi mendarat di halaman yang masih "Daftar Sekarang"). Bagian pasca-acara
  // hanya tampil kalau datanya memang diisi panitia. Acara "cancelled"
  // dikecualikan — itu dibatalkan, bukan selesai; jangan pasang chip "SELESAI".
  const isPast =
    event.status !== "cancelled" &&
    (event.status === "completed" || (event.startAt ? new Date(event.startAt) < now : false));

  // Pendaftaran volunteer terbuka: tampilkan formnya beserta pilihan divisinya.
  const volunteerDivisions = event.volunteerSignupOpen
    ? await db
        .select({ id: eventDivisions.id, name: eventDivisions.name, parent: eventDivisions.parentDivisionId })
        .from(eventDivisions)
        .where(eq(eventDivisions.eventId, event.id))
        .orderBy(eventDivisions.orderIndex)
    : [];
  const volunteerOptions = volunteerDivisions.map((d) =>
    d.parent ? `— ${volunteerDivisions.find((p) => p.id === d.parent)?.name ?? ""} › ${d.name}` : d.name
  );

  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.eventId, event.id));
  const photos = album
    ? await db.select().from(galleryPhotos).where(and(eq(galleryPhotos.albumId, album.id), eq(galleryPhotos.isHighlight, true))).limit(4)
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
  // "13.00 - Registrasi" -> { time: "13.00", label: "Registrasi" }; baris tanpa
  // pola waktu-di-depan dibiarkan utuh sebagai label.
  const agenda = agendaItems.map((raw) => {
    const m = raw.match(/^(\d{1,2}[.:]\d{2}(?:\s*[-–—]\s*\d{1,2}[.:]\d{2})?)\s*[-–—]\s*(.+)$/);
    return m ? { time: m[1].trim(), label: m[2].trim() } : { time: null, label: raw };
  });

  const startDate = event.startAt ? new Date(event.startAt) : null;
  const fmtTime = (d: Date) =>
    d.getHours() !== 0 || d.getMinutes() !== 0
      ? d.toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" })
      : null;
  const timeRange = startDate
    ? [fmtTime(startDate), event.endAt ? fmtTime(new Date(event.endAt)) : null].filter(Boolean).join(" – ")
    : "";

  const statusChip = isPast
    ? t("events.ended")
    : event.status === "registration_closed"
      ? t("events.notOpen")
      : null;

  const themed = !!(event.themeBg && event.themeAccent && event.themeAccent2);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background text-on-background"
      data-event-themed={themed ? "" : undefined}
    >
      <EventThemeStyle bg={event.themeBg} accent={event.themeAccent} accent2={event.themeAccent2} />
      {/* Latar ambient dari poster — dipakai saat tema kustom TIDAK aktif
          (halaman tanpa warna kustom, atau mode gelap; EventThemeStyle
          menyembunyikannya hanya di mode terang saat tema di-set). */}
      {event.coverImageUrl && (
        <div
          data-ambient
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[75vh] opacity-[0.12]"
        >
          <Image src={event.coverImageUrl} alt="" fill sizes="100vw" className="scale-110 object-cover blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
      )}

      <div className="relative z-10">
        <SiteNav />

        <main className="mx-auto max-w-[var(--container-max)] px-[var(--spacing-container-padding)] py-10">
          <Link
            href="/events"
            className="mb-6 inline-flex items-center gap-2 rounded text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t("events.back")}
          </Link>

          {event.coverImageUrl ? (
            <Reveal>
              <header className="relative mb-12 overflow-hidden rounded-3xl border border-outline-variant">
                <div className="relative h-[22rem] w-full sm:h-[28rem] lg:h-[32rem]">
                  <Image
                    src={event.coverImageUrl}
                    alt={event.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 1100px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 sm:p-10">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.category && (
                      <span className="evt-chip rounded-full bg-white/15 px-3 py-1 text-label-caps uppercase tracking-wide text-white backdrop-blur">
                        {event.category}
                      </span>
                    )}
                    {event.requiresSensus && (
                      <span className="evt-chip rounded-full bg-white/15 px-3 py-1 text-label-caps uppercase tracking-wide text-white backdrop-blur">
                        {t("events.sensusOnly")}
                      </span>
                    )}
                    {statusChip && (
                      <span className="rounded-full bg-error/85 px-3 py-1 text-label-caps uppercase tracking-wide text-white backdrop-blur">
                        {statusChip}
                      </span>
                    )}
                  </div>
                  <AnimatedHeroHeading
                    words={event.title.split(" ")}
                    className="max-w-3xl text-display-hero-mobile leading-tight text-white md:text-display-hero"
                  />
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-white/85">
                    {startDate && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={15} aria-hidden="true" />
                        {startDate.toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "long" })}
                        {timeRange && ` · ${timeRange}`}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={15} aria-hidden="true" /> {event.location}
                      </span>
                    )}
                    {isPast ? (
                      event.finalAttendeeCount != null && (
                        <span className="flex items-center gap-1.5">
                          <Users size={15} aria-hidden="true" /> {t("events.attendedCount", { count: event.finalAttendeeCount })}
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Users size={15} aria-hidden="true" /> {t("events.registered", { count: registeredCount })}
                      </span>
                    )}
                  </div>
                </div>
              </header>
            </Reveal>
          ) : (
            <div className="mb-12">
              {event.category && (
                <span className="mb-3 block text-label-caps uppercase tracking-wide text-primary-container">
                  {event.category}
                </span>
              )}
              {event.requiresSensus && (
                <span className="mb-3 block w-fit rounded bg-surface-container-low px-2.5 py-1 text-label-caps uppercase tracking-wide text-primary-container">
                  {t("events.sensusOnly")}
                </span>
              )}
              <AnimatedHeroHeading
                words={event.title.split(" ")}
                className="text-display-hero-mobile leading-tight text-on-background md:text-display-hero"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-12 lg:col-span-8">
              {event.description && (
                <Reveal>
                  <div className="evt-surface rounded-2xl border border-outline-variant bg-surface-container-lowest/70 p-6 sm:p-8">
                    <p className="whitespace-pre-wrap text-body-lg leading-relaxed text-on-surface-variant">
                      {event.description}
                    </p>
                  </div>
                </Reveal>
              )}

              {agenda.length > 0 && (
                <Reveal>
                  <section>
                    <h2 className="mb-7 flex items-center gap-2 text-headline-md text-on-background">
                      <ListChecks className="text-primary-container" size={20} /> {t("events.agenda")}
                    </h2>
                    <ol className="evt-rail ml-2 flex flex-col gap-6 border-l-2 border-primary-container/30">
                      {agenda.map((item, i) => (
                        <li key={i} className="relative ml-6">
                          <span
                            aria-hidden
                            className="evt-dot absolute -left-[calc(1.5rem+1px)] top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-primary-container ring-4 ring-background"
                          />
                          {item.time ? (
                            <div className="flex flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-baseline">
                              <span className="shrink-0 text-label-caps uppercase tracking-wide tabular-nums text-primary-container">
                                {item.time}
                              </span>
                              <span className="text-body-md text-on-background">{item.label}</span>
                            </div>
                          ) : (
                            <span className="text-body-md text-on-background">{item.label}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                </Reveal>
              )}

              {(() => {
                // Satu bagian media, dua judul. Pasca-acara: "Dokumentasi &
                // Materi" (recap + drive + foto). Pra-acara: "Galeri" (foto saja,
                // langka — album biasanya belum ada). Kalau tidak ada yang bisa
                // ditampilkan, tidak render apa pun.
                const showMaterials =
                  isPast && (!!event.recapVideoUrl || photos.length > 0 || !!album?.driveUrl);
                const showGallery = !isPast && photos.length > 0;
                if (!showMaterials && !showGallery) return null;
                const btn =
                  "inline-flex items-center gap-2 rounded-md px-5 py-3 text-label-caps uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";
                return (
                  <Reveal>
                    <section>
                      <h2 className="mb-6 flex items-center gap-2 text-headline-md text-on-background">
                        <Images className="text-primary-container" size={20} />{" "}
                        {showMaterials ? t("events.materials") : t("events.gallery")}
                      </h2>
                      {showMaterials && (event.recapVideoUrl || album?.driveUrl) && (
                        <div className="mb-6 flex flex-wrap gap-3">
                          {event.recapVideoUrl && (
                            <a
                              href={event.recapVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${btn} bg-primary-container text-on-primary hover:bg-primary`}
                            >
                              <PlayCircle size={16} aria-hidden="true" /> {t("events.watchRecap")}
                            </a>
                          )}
                          {album?.driveUrl && (
                            <a
                              href={album.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${btn} border border-outline-variant text-on-background hover:bg-surface-container-low`}
                            >
                              <FolderOpen size={16} aria-hidden="true" /> {t("gallery.driveAll")}
                            </a>
                          )}
                        </div>
                      )}
                      {photos.length > 0 && (
                        <>
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
                              className="mt-4 inline-flex items-center gap-1 text-label-caps uppercase text-primary-container transition-colors hover:text-primary"
                            >
                              {t("events.viewAlbum")} <ArrowRight size={14} />
                            </a>
                          )}
                        </>
                      )}
                    </section>
                  </Reveal>
                );
              })()}
            </div>

            <div className="lg:col-span-4">
              <Reveal>
                <div className="evt-tintcard sticky top-24 flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                {event.startAt && (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="text-primary-container shrink-0 mt-0.5" size={18} aria-hidden="true" />
                    <div>
                       <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">{t("events.dateTime")}</p>
                       <p className="text-body-md text-on-background font-semibold">
                         {new Date(event.startAt).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "full" })}
                       </p>
                       {(() => {
                         const start = new Date(event.startAt);
                         const startTime =
                           start.getHours() !== 0 || start.getMinutes() !== 0
                             ? start.toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" })
                             : null;
                         const endTime =
                           event.endAt &&
                           (new Date(event.endAt).getHours() !== 0 || new Date(event.endAt).getMinutes() !== 0)
                             ? new Date(event.endAt).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" })
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
                      <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">{t("events.location")}</p>
                      <p className="text-body-md text-on-background font-semibold">{event.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Users className="text-primary-container shrink-0 mt-0.5" size={18} aria-hidden="true" />
                  <div className="flex-1">
                    {isPast ? (
                      <>
                        <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">{t("events.attendance")}</p>
                        <p className="text-body-md text-on-background font-semibold">
                          {event.finalAttendeeCount != null
                            ? t("events.attendedCount", { count: event.finalAttendeeCount })
                            : t("events.registered", { count: registeredCount })}
                        </p>
                        {event.attendanceNote && (
                          <p className="text-label-caps text-on-surface-variant mt-0.5">{event.attendanceNote}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-label-caps uppercase text-on-surface-variant mb-0.5">{t("events.attendees")}</p>
                        <p className="text-body-md text-on-background font-semibold">
                          {t("events.registered", { count: registeredCount })}
                          {event.capacity ? ` / ${event.capacity}` : ""}
                        </p>
                        {event.capacity != null && !isFull && (
                          <p className="text-label-caps text-primary-container mt-0.5">
                            {t("events.slotsLeft", { n: event.capacity - registeredCount })}
                          </p>
                        )}
                        {event.capacity != null && (
                          <div
                            className="mt-2 h-2 w-full rounded-full bg-surface-container-low overflow-hidden"
                            role="progressbar"
                            aria-label={t("events.capacityLabel")}
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
                      </>
                    )}
                  </div>
                </div>
                {!isPast && event.registrationDeadline && (
                  <p className="text-label-caps text-on-surface-variant">
                    {t("events.regDeadline", {
                      date: new Date(event.registrationDeadline).toLocaleDateString(INTL_LOCALE[locale], {
                        dateStyle: "long",
                      }),
                    })}
                  </p>
                )}

                {agenda.length > 0 && !isPast && (
                  <div className="border-t border-outline-variant pt-5">
                    <p className="mb-3 flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      <ListChecks size={14} className="text-primary-container" aria-hidden="true" /> {t("events.agenda")}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {agenda.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-body-sm">
                          <span className="w-14 shrink-0 tabular-nums text-primary-container">{item.time ?? "•"}</span>
                          <span className="text-on-surface-variant">{item.label}</span>
                        </li>
                      ))}
                      {agenda.length > 5 && (
                        <li className="text-label-caps text-on-surface-variant">
                          +{agenda.length - 5} lagi &darr;
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="border-t border-outline-variant pt-5" role="status" aria-live="polite">
                  {isPast ? (
                    <div className="flex flex-col gap-3">
                      {alreadyRegistered && (
                        <a
                          href={`/events/${slug}/ticket`}
                          className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                        >
                          <Ticket size={18} aria-hidden="true" /> {t("events.myTicket")}
                        </a>
                      )}
                      <p className="flex items-center justify-center gap-2 text-body-md text-on-surface-variant text-center bg-surface-container-low rounded-md px-4 py-3">
                        <PartyPopper size={16} aria-hidden="true" /> {t("events.endedNote")}
                      </p>
                    </div>
                  ) : (
                   <>
                  {event.requiresSensus && !alreadyRegistered && (
                    <>
                      <p className="text-label-caps text-on-surface-variant mb-3 text-center">
                        {t("events.sensusRequiredNote")}
                      </p>
                      <p className="text-body-md text-on-surface-variant text-center mb-4">
                        {t("events.sensusCompleteMsg")}
                      </p>
                      <Link
                        href={`/sensus?returnTo=${encodeURIComponent(`/events/${slug}`)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                      >
                        <ListChecks size={18} aria-hidden="true" /> {t("events.fillSensus")}
                      </Link>
                    </>
                  )}
                  {alreadyRegistered ? (
                    <a
                      href={`/events/${slug}/ticket`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                    >
                      <Ticket size={18} aria-hidden="true" /> {t("events.myTicket")}
                    </a>
                  ) : canRegister ? (
                    <Link
                      href={
                        session?.user?.id
                          ? `/events/${slug}/register`
                          : `/login?returnTo=${encodeURIComponent(`/events/${slug}/register`)}`
                      }
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                    >
                      {session?.user?.id ? (
                        <>
                          {t("events.registerNow")} <ArrowRight size={18} aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <ArrowRight size={18} aria-hidden="true" /> {t("events.loginToRegister")}
                        </>
                      )}
                    </Link>
                  ) : (
                    <p className="flex items-center justify-center gap-2 text-body-md text-on-surface-variant text-center bg-surface-container-low rounded-md px-4 py-3">
                      {isFull ? (
                        <>
                          <Users size={16} aria-hidden="true" /> {t("events.full")}
                        </>
                      ) : deadlinePassed ? (
                        <>
                          <CalendarX size={16} aria-hidden="true" /> {t("events.deadlinePassed")}
                        </>
                      ) : (
                        t("events.notOpen")
                      )}
                    </p>
                  )}
                   </>
                  )}
                </div>
                {event.volunteerSignupOpen && event.status === "published" && !isPast && (
                  <div className="border-t border-outline-variant pt-5">
                    {myCommitteeRole ? (
                      <div className="flex flex-col gap-3">
                        <p className="flex items-start gap-2 text-body-md text-on-background bg-surface-container-low rounded-md px-4 py-3">
                          <BadgeCheck size={18} className="text-primary-container shrink-0 mt-0.5" aria-hidden />
                          <span>
                            Kamu sudah tercatat sebagai panitia acara ini
                            {myCommitteeRole.divisionName ? ` — ${COMMITTEE_ROLE_LABEL[myCommitteeRole.role] ?? myCommitteeRole.role} ${myCommitteeRole.divisionName}` : ""}.
                            {" "}Tidak perlu mendaftar volunteer lagi.
                          </span>
                        </p>
                        <Link
                          href={`/events/${slug}/committee`}
                          className="self-start inline-flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-secondary transition-colors"
                        >
                          <Ticket size={16} aria-hidden /> Tiket Kepanitiaan (QR Absensi)
                        </Link>
                      </div>
                    ) : volunteerFlag === "committee" ? (
                      <p className="flex items-start gap-2 text-body-md text-on-background bg-surface-container-low rounded-md px-4 py-3">
                        <BadgeCheck size={18} className="text-primary-container shrink-0 mt-0.5" aria-hidden />
                        <span>Lamaran tidak terkirim — email ini sudah tercatat sebagai panitia acara ini. Hubungi admin bila ada kekeliruan.</span>
                      </p>
                    ) : volunteerFlag === "sent" ? (
                      <p className="flex items-center gap-2 text-body-md text-on-background bg-surface-container-low rounded-md px-4 py-3">
                        <PartyPopper size={18} className="text-primary-container shrink-0" aria-hidden />
                        <span>Lamaran volunteer terkirim! Panitia akan menghubungimu lewat email.</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-label-caps uppercase tracking-wide text-primary-container mb-1">Jadi Volunteer</p>
                        <p className="text-body-sm text-on-surface-variant mb-3">
                          Butuh orang? Daftarkan dirimu membantu acara ini — tidak harus anggota PPIT.
                        </p>
                        <form action={applyAsVolunteer} className="flex flex-col gap-2">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="slug" value={slug} />
                          <input name="fullName" required placeholder="Nama lengkap *" aria-label="Nama lengkap" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
                          <input name="email" type="email" required placeholder="Email * (untuk akun portal)" aria-label="Email" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
                          <input name="whatsapp" placeholder="WhatsApp / WeChat (opsional)" aria-label="WhatsApp atau WeChat" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
                          <Select name="divisionId" defaultValue="" aria-label="Divisi yang diminati" className="w-full">
                            <option value="">Divisi yang diminati — bebas</option>
                            {volunteerOptions.map((label, i) => (
                              <option key={volunteerDivisions[i].id} value={volunteerDivisions[i].id}>{label}</option>
                            ))}
                          </Select>
                          <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                          >
                            Kirim Lamaran Volunteer
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-outline-variant">
            <Reveal>
              <h2 className="text-headline-lg text-on-background mb-8">{t("events.others")}</h2>
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
    </div>
  );
}
