import { eq, and, ne, count, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventQuestions, eventDivisions, galleryAlbums, galleryPhotos, regionalBranches } from "@/db/schema";
import { NON_STUDENT_BRANCH } from "@/lib/membership-status";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { EventCard } from "@/components/event-card";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { CalendarDays, MapPin, Users, Ticket, ArrowLeft, ListChecks, Images, ArrowRight, CalendarX, PartyPopper } from "lucide-react";
import Image from "next/image";
import { registerForEvent } from "@/app/actions/events";
import Link from "next/link";
import { applyAsVolunteer } from "@/app/actions/volunteers";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

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
  // Cabang hanya ditanyakan ke peserta yang sensusnya belum lengkap - kalau
  // sudah, cabangnya sudah kita ketahui dan menanyakan ulang cuma menambah
  // gesekan pada tombol yang tadinya sekali klik.
  //
  // Acara ber-requiresSensus dikecualikan: siapa pun yang berhasil mendaftar ke
  // sana pasti sensusnya sudah lengkap (kalau belum, registerForEvent
  // mengalihkannya ke /sensus), jadi menanyakan cabang di situ hanya memasang
  // dropdown wajib di depan tombol yang ujungnya mengalihkan juga.
  let askBranch = false;
  if (session?.user?.id) {
    const [existing] = await db
      .select()
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, session.user.id)));
    alreadyRegistered = !!existing;
    askBranch =
      !alreadyRegistered && !event.requiresSensus && !(await hasCompletedSensus(session.user.id));
  }
  const branchOptions = askBranch
    ? (await db.select({ cityName: regionalBranches.cityName }).from(regionalBranches))
        .map((b) => b.cityName)
        .sort((a, b) => a.localeCompare(b))
    : [];

  const now = new Date();
  const deadlinePassed = event.registrationDeadline ? new Date(event.registrationDeadline) < now : false;
  const isFull = event.capacity != null && registeredCount >= event.capacity;
  const canRegister = event.status === "published" && !isFull && !deadlinePassed;

  // Pertanyaan kustom hanya relevan bagi yang benar-benar akan melihat form.
  const questions =
    session?.user?.id && !alreadyRegistered && canRegister && !event.requiresSensus
      ? await db
          .select()
          .from(eventQuestions)
          .where(eq(eventQuestions.eventId, event.id))
          .orderBy(eventQuestions.orderIndex, eventQuestions.id)
      : [];

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
           <ArrowLeft size={16} aria-hidden="true" /> {t("events.back")}
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
                {t("events.sensusOnly")}
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
                    <ListChecks className="text-primary-container" size={20} /> {t("events.agenda")}
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
                    <Images className="text-primary-container" size={20} /> {t("events.gallery")}
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
                       {t("events.viewAlbum")} <ArrowRight size={14} />
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
                  </div>
                </div>
                {event.registrationDeadline && (
                  <p className="text-label-caps text-on-surface-variant">
                    {t("events.regDeadline", {
                      date: new Date(event.registrationDeadline).toLocaleDateString(INTL_LOCALE[locale], {
                        dateStyle: "long",
                      }),
                    })}
                  </p>
                )}

                <div className="border-t border-outline-variant pt-5" role="status" aria-live="polite">
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
                    session?.user?.id ? (
                      <form action={registerForEvent.bind(null, event.id, slug)} className="flex flex-col gap-3">
                        {askBranch && (
                          <label className="flex flex-col gap-2 text-left">
                            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
                              {t("events.branchQuestion")}
                              <span className="text-error" aria-hidden="true"> *</span>
                            </span>
                            <select
                              name="branch"
                              required
                              defaultValue=""
                              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                            >
                              <option value="" disabled>
                                {t("events.branchPlaceholder")}
                              </option>
                              {branchOptions.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                              <option value={NON_STUDENT_BRANCH}>{t("events.branchNonStudent")}</option>
                            </select>
                            <span className="text-xs text-on-surface-variant">{t("events.branchHint")}</span>
                          </label>
                        )}
                        {questions.map((q) => {
                          const options = (q.options ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
                          const fieldClass =
                            "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
                          return (
                            <fieldset key={q.id} className="flex flex-col gap-2 text-left border-0 p-0 m-0">
                              <legend className="text-label-caps uppercase tracking-wide text-on-surface-variant p-0">
                                {q.label}
                                {q.required && <span className="text-error" aria-hidden="true"> *</span>}
                              </legend>
                              {q.type === "text" && (
                                <input name={q.id} required={q.required} className={fieldClass} />
                              )}
                              {q.type === "textarea" && (
                                <textarea name={q.id} required={q.required} rows={3} className={`${fieldClass} resize-none`} />
                              )}
                              {q.type === "select" && (
                                <select name={q.id} required={q.required} defaultValue="" className={fieldClass}>
                                  <option value="" disabled>—</option>
                                  {options.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                  ))}
                                </select>
                              )}
                              {(q.type === "radio" || q.type === "multiselect") &&
                                options.map((o) => (
                                  <label key={o} className="flex items-center gap-2 bg-soft-gray rounded-md p-2.5 text-body-md cursor-pointer">
                                    <input
                                      type={q.type === "radio" ? "radio" : "checkbox"}
                                      name={q.id}
                                      value={o}
                                      required={q.required && q.type === "radio"}
                                      className="h-4 w-4 accent-[var(--color-primary-container)]"
                                    />
                                    {o}
                                  </label>
                                ))}
                            </fieldset>
                          );
                        })}
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                        >
                          <Ticket size={18} aria-hidden="true" /> {t("events.registerNow")}
                        </button>
                      </form>
                    ) : (
                      <Link
                        href={`/login?returnTo=${encodeURIComponent(`/events/${slug}`)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-4 rounded-md hover:bg-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
                      >
                        <ArrowRight size={18} aria-hidden="true" /> {t("events.loginToRegister")}
                      </Link>
                    )
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
                </div>
                {event.volunteerSignupOpen && event.status === "published" && (
                  <div className="border-t border-outline-variant pt-5">
                    {volunteerFlag === "sent" ? (
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
                          <select name="divisionId" defaultValue="" aria-label="Divisi yang diminati" className="bg-soft-gray rounded-md p-2.5 text-body-md">
                            <option value="">Divisi yang diminati — bebas</option>
                            {volunteerOptions.map((label, i) => (
                              <option key={volunteerDivisions[i].id} value={volunteerDivisions[i].id}>{label}</option>
                            ))}
                          </select>
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
  );
}
