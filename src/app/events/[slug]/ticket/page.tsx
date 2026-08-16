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
import Link from "next/link";
import { CheckCircle2, CalendarDays, MapPin } from "lucide-react";

export default async function EventTicketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">Pendaftaran Berhasil</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Tunjukkan QR code ini saat check-in di lokasi acara.
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Tiket" className="mx-auto mb-6 rounded-lg" width={240} height={240} />
          <h2 className="text-headline-md text-on-background mb-3">{event.title}</h2>

          <div className="flex flex-col items-center gap-2 mb-4">
            <p className="text-label-caps text-on-surface-variant">Token check-in (cadangan jika QR tak terbaca)</p>
            <code className="bg-surface-container-low px-3 py-1.5 rounded-md text-body-sm break-all select-all">{token}</code>
            <CopyButton value={token} label="Salin Token" />
          </div>

          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant items-center">
            {event.startAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} /> {new Date(event.startAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {event.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
          <Link
            href="/events"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            Kegiatan Lainnya
          </Link>
          <Link
            href="/"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
