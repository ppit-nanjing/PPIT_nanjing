import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CalendarDays, MapPin, ArrowLeft, CalendarPlus } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

export default async function EventTicketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getT();
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(`/events/${slug}/ticket`)}`);

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();

  const [registration] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, session.user.id)));

  if (!registration) redirect(`/events/${slug}`);

  // Encode an absolute check-in URL (not just the raw token) so any phone camera
  // can scan it and open the admin scanner directly, which identifies the user.
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const token = registration.qrCodeToken ?? registration.id;
  const checkInUrl = `${origin}/console/events/${event.id}/scan?t=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { margin: 1, width: 240 });

  const fmtCal = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const calUrl = event.startAt
    ? `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.title
      )}&dates=${fmtCal(new Date(event.startAt))}/${fmtCal(event.endAt ? new Date(event.endAt) : new Date(event.startAt))}&location=${encodeURIComponent(
        event.location ?? ""
      )}&details=${encodeURIComponent(t("ticket.calDetails"))}`
    : null;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} aria-hidden="true" />
        </div>
        <div role="status" aria-live="polite">
          <h1 className="text-headline-lg text-on-background mb-2">{t("ticket.success")}</h1>
          <p className="text-body-md text-on-surface-variant mb-10">
            {t("ticket.successDesc", { name: session.user.name?.split(" ")[0] ?? "" })}
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          <Image
            src={qrDataUrl}
            alt={t("ticket.qrAlt", { title: event.title })}
            width={240}
            height={240}
            unoptimized
            className="mx-auto mb-6 rounded-lg"
          />
          <h2 className="text-headline-md text-on-background mb-3">{event.title}</h2>

          {calUrl && (
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-surface-container-low transition-colors mb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <CalendarPlus size={16} aria-hidden="true" /> {t("ticket.addCalendar")}
            </a>
          )}

          <div className="flex flex-col items-center gap-2 mb-4">
            <p className="text-label-caps text-on-surface-variant">{t("ticket.checkinToken")}</p>
            <code className="bg-surface-container-low px-3 py-1.5 rounded-md text-body-sm break-all select-all">{token}</code>
            <CopyButton value={token} label={t("ticket.copyToken")} />
          </div>

          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant items-center">
            {event.startAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" />{" "}
                {new Date(event.startAt).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "full" })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> {event.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
          <Link
            href={`/events/${slug}`}
            className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft size={16} aria-hidden="true" /> {t("ticket.toDetail")}
          </Link>
          <Link
            href="/events"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("events.others")}
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
