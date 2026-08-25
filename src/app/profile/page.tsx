import { eq, desc, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users, sensusProfiles, events, eventRegistrations, borrowRequests, inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { EmailSubscriptionToggle } from "@/components/profile/email-subscription-toggle";
import { BackButton } from "@/components/profile/back-button";
import { LanguageSelector } from "@/components/profile/language-selector";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { updateProfile } from "@/app/actions/user";
import { requestReturn } from "@/app/actions/inventory";
import { getMyCertificates } from "@/app/actions/committee";
import { getT } from "@/lib/i18n/server";
import {
  ClipboardCheck,
  ClipboardList,
  UserRound,
  CheckCircle2,
  Award,
  CalendarDays,
  Package,
  Pencil,
  SlidersHorizontal,
  Languages,
  Bell,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Status pendaftaran acara - label & warna selaras dengan /profile/submissions
// supaya dua tampilan riwayat yang sama tidak berbeda bahasa.
const REG_STATUS_KEY: Record<string, TKey> = {
  pending: "submissions.status.pending",
  confirmed: "submissions.status.confirmed",
  attended: "submissions.status.attended",
  cancelled: "submissions.status.cancelled",
};
const REG_STATUS_STYLE: Record<string, string> = {
  pending: "bg-surface-container-low text-on-surface-variant",
  confirmed: "bg-primary-container/10 text-primary-container",
  attended: "bg-primary-container/10 text-primary-container",
  cancelled: "bg-error-container text-on-error-container",
};

// Peminjaman aktif di profil - label & warna selaras dengan /profile/submissions.
const BORROW_STATUS_KEY: Record<string, TKey> = {
  approved: "submissions.status.approved",
  borrowed: "submissions.status.borrowed",
  overdue: "submissions.status.overdue",
};
const BORROW_STATUS_STYLE: Record<string, string> = {
  approved: "bg-primary-container/10 text-primary-container",
  borrowed: "bg-primary-container/10 text-primary-container",
  overdue: "bg-error-container text-on-error-container",
};

// date columns arrive as "YYYY-MM-DD" strings - parse as local midnight so
// the displayed day never shifts across timezones.
function formatBorrowDate(date: string | null): string {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/profile")}`);
  const { saved } = await searchParams;

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  const [sensus] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, session.user.id));
  const certificates = await getMyCertificates();
  const myEvents = await db
    .select({
      id: eventRegistrations.id,
      status: eventRegistrations.status,
      title: events.title,
      slug: events.slug,
      startAt: events.startAt,
      registeredAt: eventRegistrations.registeredAt,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(eventRegistrations.eventId, events.id))
    .where(eq(eventRegistrations.userId, session.user.id))
    .orderBy(desc(events.startAt));
  // Barang yang saat ini dipinjam / akan diambil - approved (menunggu
  // pengambilan), borrowed (di tangan peminjam), overdue (lewat jadwal).
  const myBorrows = await db
    .select({ req: borrowRequests, itemName: inventoryItems.name, imageUrl: inventoryItems.imageUrl })
    .from(borrowRequests)
    .innerJoin(inventoryItems, eq(borrowRequests.itemId, inventoryItems.id))
    .where(
      and(
        eq(borrowRequests.userId, session.user.id),
        inArray(borrowRequests.status, ["approved", "borrowed", "overdue"]),
      ),
    )
    .orderBy(desc(borrowRequests.requestedAt));
  const { t } = await getT();

  const sensusComplete = sensus?.completionStatus === "complete";

  return (
    <>
      <SiteNav />
      <div className="min-h-screen bg-background px-[var(--spacing-container-padding)] py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="sr-only">{t("profile.title")}</h1>

          {saved === "1" && (
            <div
              role="status"
              className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-md px-4 py-3 mb-6"
            >
              <CheckCircle2 size={18} className="text-primary-container shrink-0" aria-hidden />
              <span className="text-body-sm text-on-background">{t("profile.savedNotice")}</span>
            </div>
          )}

          {/* ---------- Kartu identitas ---------- */}
          <header className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm mb-6">
            <div
              aria-hidden
              className="h-20 sm:h-24 bg-gradient-to-r from-primary-container/30 via-secondary/15 to-tertiary/25"
            />
            <div className="relative px-5 sm:px-8 pb-6">
              <div className="flex flex-wrap items-end gap-x-5 gap-y-3 -mt-9 sm:-mt-11">
                <div className="w-[76px] h-[76px] sm:w-20 sm:h-20 rounded-full ring-4 ring-background overflow-hidden bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  {user?.avatarUrl || session.user.image ? (
                    <Image
                      src={(user?.avatarUrl || session.user.image) as string}
                      alt={user?.name ?? session.user.name ?? "Profile"}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserRound size={32} aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-[220px] pb-1">
                  <p className="text-headline-md text-on-background leading-tight">
                    {user?.name ?? session.user.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <p className="text-body-sm text-on-surface-variant">{session.user.email}</p>
                    <Link
                      href="/sensus"
                      className={`inline-flex items-center gap-1.5 text-label-caps px-2 py-0.5 rounded-full ${sensusComplete ? "bg-primary-container/10 text-primary-container" : "bg-surface-container-low text-on-surface-variant"} hover:opacity-80 transition-opacity`}
                    >
                      {sensusComplete ? (
                        <ClipboardCheck size={13} aria-hidden />
                      ) : (
                        <ClipboardList size={13} aria-hidden />
                      )}
                      {sensusComplete ? t("profile.sensusComplete") : t("profile.sensusIncomplete")}
                    </Link>
                  </div>
                </div>
                <Link
                  href="#profil"
                  className="inline-flex items-center gap-1.5 mb-1 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background px-4 py-2 rounded-full hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  <Pencil size={14} aria-hidden /> {t("profile.editProfile")}
                </Link>
              </div>

              <dl className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
                {(
                  [
                    [t("profile.statEvents"), myEvents.length],
                    [t("profile.statCertificates"), certificates.length],
                    [t("profile.statBorrows"), myBorrows.length],
                  ] as const
                ).map(([label, count]) => (
                  <div
                    key={label}
                    className="bg-surface-container-low rounded-lg px-2 py-3 text-center"
                  >
                    <dd className="text-headline-md text-on-background">{count}</dd>
                    <dt className="text-label-caps text-on-surface-variant mt-0.5">{label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </header>

          {/* ---------- Konten per tab ---------- */}
          <ProfileTabs
            ariaLabel={t("profile.title")}
            tabs={[
              {
                id: "profil",
                label: t("profile.tabProfile"),
                icon: <UserRound size={15} aria-hidden />,
                content: (
                  <section
                    aria-label={t("profile.sectionProfile")}
                    className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-8"
                  >
                    <form action={updateProfile} className="flex flex-col gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("profile.displayName")}</span>
                        <input
                          name="name"
                          defaultValue={user?.name ?? session.user.name ?? ""}
                          placeholder={t("profile.displayNamePlaceholder")}
                          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                        />
                      </label>
                      <ImageUploadCropper
                        name="avatarUrl"
                        folder="avatar"
                        label={t("profile.photo")}
                        defaultValue={user?.avatarUrl ?? ""}
                        aspect={1}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-2">
                          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("profile.phone")}</span>
                          <input
                            name="phone"
                            defaultValue={user?.phone ?? ""}
                            placeholder="+86 ..."
                            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("profile.wechat")}</span>
                          <input
                            name="wechatId"
                            defaultValue={user?.wechatId ?? ""}
                            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                          />
                        </label>
                      </div>

                      <h3 className="text-label-caps uppercase tracking-wide text-secondary mt-2">
                        {t("profile.socialHeading")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(
                          [
                            ["linkedinUrl", "LinkedIn", user?.linkedinUrl],
                            ["instagramUrl", "Instagram", user?.instagramUrl],
                            ["githubUrl", "GitHub", user?.githubUrl],
                            ["spotifyUrl", "Spotify", user?.spotifyUrl],
                            ["tiktokUrl", "TikTok", user?.tiktokUrl],
                          ] as const
                        ).map(([fieldName, fieldLabel, current]) => (
                          <label key={fieldName} className="flex flex-col gap-2">
                            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{fieldLabel}</span>
                            <input
                              name={fieldName}
                              defaultValue={current ?? ""}
                              placeholder={t("profile.urlPlaceholder")}
                              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="submit"
                          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                        >
                          {t("profile.saveButton")}
                        </button>
                        <BackButton label={t("profile.cancel")} />
                      </div>
                    </form>
                  </section>
                ),
              },
              {
                id: "peminjaman",
                label: t("profile.tabBorrows"),
                icon: <Package size={15} aria-hidden />,
                badge: myBorrows.length,
                content:
                  myBorrows.length === 0 ? (
                    <section
                      aria-label={t("profile.borrowHeading")}
                      className="flex flex-col items-center text-center bg-surface-container-lowest border border-outline-variant rounded-2xl px-6 py-14"
                    >
                      <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline-variant mb-4">
                        <Package size={28} aria-hidden />
                      </div>
                      <p className="text-body-md text-on-surface-variant max-w-xs mb-6">
                        {t("profile.borrowEmpty")}
                      </p>
                      <Link
                        href="/inventory"
                        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                      >
                        {t("profile.borrowBrowseInventory")}
                      </Link>
                    </section>
                  ) : (
                    <ul
                      aria-label={t("profile.borrowHeading")}
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 sm:px-5"
                    >
                      {myBorrows.map(({ req, itemName, imageUrl }) => (
                        <li
                          key={req.id}
                          className="flex flex-wrap sm:flex-nowrap items-start gap-4 py-4 border-b border-outline-variant/60 last:border-0"
                        >
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt=""
                              width={56}
                              height={56}
                              className="w-14 h-14 rounded-lg object-cover border border-outline-variant shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary shrink-0">
                              <Package size={22} aria-hidden />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-body-md font-medium text-on-background">
                              {itemName} &times; {req.quantity}
                            </p>
                            <p className="flex items-center gap-1.5 text-label-caps text-on-surface-variant mt-0.5">
                              <CalendarDays size={13} aria-hidden />
                              {[
                                req.requestedFrom && formatBorrowDate(req.requestedFrom),
                                req.requestedTo && formatBorrowDate(req.requestedTo),
                              ]
                                .filter(Boolean)
                                .join(" – ") || t("submissions.kind.borrow")}
                            </p>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                            <span
                              className={`text-label-caps uppercase tracking-wide px-2.5 py-1 rounded ${BORROW_STATUS_STYLE[req.status] ?? "bg-surface-container-low text-on-surface-variant"}`}
                            >
                              {req.status in BORROW_STATUS_KEY ? t(BORROW_STATUS_KEY[req.status]) : req.status}
                            </span>
                            {(req.status === "borrowed" || req.status === "overdue") &&
                              (req.returnRequestedAt ? (
                                <span className="text-label-caps text-on-surface-variant text-right">
                                  {t("profile.borrowReturnPending")}
                                </span>
                              ) : (
                                <form action={requestReturn.bind(null, req.id)}>
                                  <button
                                    type="submit"
                                    className="text-label-caps uppercase tracking-wide bg-primary-container/10 text-primary-container px-3 py-1.5 rounded-md hover:bg-primary-container/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                                  >
                                    {t("profile.borrowReturnButton")}
                                  </button>
                                </form>
                              ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ),
              },
              {
                id: "aktivitas",
                label: t("profile.tabActivity"),
                icon: <Award size={15} aria-hidden />,
                badge: certificates.length + myEvents.length,
                content: (
                  <>
                    <section aria-labelledby="profile-certificates-heading" className="mb-8">
                      <h2
                        id="profile-certificates-heading"
                        className="text-label-caps uppercase tracking-widest text-secondary mb-3"
                      >
                        {t("profile.certificatesHeading")} · {certificates.length}
                      </h2>
                      {certificates.length === 0 ? (
                        <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-6">
                          {t("profile.certificatesEmpty")}
                        </p>
                      ) : (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {certificates.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-start gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:bg-surface-container-low transition-colors"
                            >
                              <Award className="text-primary-container shrink-0 mt-0.5" size={20} aria-hidden />
                              <div className="min-w-0">
                                <p className="text-body-md font-medium text-on-background break-words">{c.title}</p>
                                <p className="text-label-caps text-on-surface-variant mt-0.5">
                                  {[
                                    c.eventTitle,
                                    new Date(c.issuedAt).toLocaleDateString("id-ID", { dateStyle: "long" }),
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                                {c.fileUrl && (
                                  <a
                                    href={c.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-label-caps uppercase tracking-wide text-primary-container hover:underline"
                                  >
                                    {t("profile.certificatesViewFile")}
                                  </a>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section aria-labelledby="profile-events-heading">
                      <h2
                        id="profile-events-heading"
                        className="text-label-caps uppercase tracking-widest text-secondary mb-3"
                      >
                        {t("profile.eventsHeading")} · {myEvents.length}
                      </h2>
                      {myEvents.length === 0 ? (
                        <p className="text-body-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-6">
                          {t("profile.eventsEmpty")}
                        </p>
                      ) : (
                        <ul className="bg-surface-container-lowest border border-outline-variant rounded-2xl px-4 sm:px-5">
                          {myEvents.map((e) => {
                            const when = e.startAt ?? e.registeredAt;
                            return (
                              <li key={e.id} className="border-b border-outline-variant/60 last:border-0">
                                <Link
                                  href={`/events/${e.slug}`}
                                  className="flex items-center gap-3 py-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded-md"
                                >
                                  <CalendarDays className="text-secondary shrink-0" size={20} aria-hidden />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-body-md font-medium text-on-background truncate group-hover:text-primary-container transition-colors">
                                      {e.title}
                                    </p>
                                    <time
                                      dateTime={when.toISOString()}
                                      className="text-label-caps text-on-surface-variant"
                                    >
                                      {when.toLocaleDateString("id-ID", { dateStyle: "long" })}
                                    </time>
                                  </div>
                                  <span
                                    className={`text-label-caps uppercase tracking-wide px-2.5 py-1 rounded shrink-0 ${REG_STATUS_STYLE[e.status] ?? "bg-surface-container-low text-on-surface-variant"}`}
                                  >
                                    {e.status in REG_STATUS_KEY ? t(REG_STATUS_KEY[e.status]) : e.status}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  </>
                ),
              },
              {
                id: "pengaturan",
                label: t("profile.tabSettings"),
                icon: <SlidersHorizontal size={15} aria-hidden />,
                content: (
                  <div className="flex flex-col gap-4">
                    <section
                      aria-labelledby="profile-settings-sensus"
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6"
                    >
                      <h2
                        id="profile-settings-sensus"
                        className="flex items-center gap-2 text-label-caps uppercase tracking-widest text-secondary mb-4"
                      >
                        <ClipboardList size={15} aria-hidden /> {t("profile.sensusHeading")}
                      </h2>
                      <Link
                        href="/sensus"
                        className="flex items-center justify-between gap-4 bg-surface-container-low border border-outline-variant rounded-lg p-4 hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                      >
                        <div className="flex items-center gap-3">
                          {sensusComplete ? (
                            <ClipboardCheck className="text-primary-container" size={20} aria-hidden />
                          ) : (
                            <ClipboardList className="text-secondary" size={20} aria-hidden />
                          )}
                          <div>
                            <p className="text-body-md font-medium text-on-background">
                              {sensusComplete ? t("profile.sensusComplete") : t("profile.sensusIncomplete")}
                            </p>
                            <p className="text-label-caps text-on-surface-variant">{t("profile.sensusDesc")}</p>
                          </div>
                        </div>
                        <span className="text-label-caps text-primary-container shrink-0">
                          {sensus ? t("profile.sensusEdit") : t("profile.sensusFill")}
                        </span>
                      </Link>
                    </section>

                    <section
                      aria-labelledby="profile-settings-language"
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6"
                    >
                      <h2
                        id="profile-settings-language"
                        className="flex items-center gap-2 text-label-caps uppercase tracking-widest text-secondary mb-4"
                      >
                        <Languages size={15} aria-hidden /> {t("settings.language.label")}
                      </h2>
                      <LanguageSelector />
                    </section>

                    <section
                      aria-labelledby="profile-settings-notifications"
                      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6"
                    >
                      <h2
                        id="profile-settings-notifications"
                        className="flex items-center gap-2 text-label-caps uppercase tracking-widest text-secondary mb-4"
                      >
                        <Bell size={15} aria-hidden /> {t("profile.notificationHeading")}
                      </h2>
                      <EmailSubscriptionToggle initialSubscribed={session.user.emailSubscribed} />
                    </section>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
