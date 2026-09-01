import { eq, and } from "drizzle-orm";
import QRCode from "qrcode";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, eventFeeOptions } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, CalendarDays, MapPin, ArrowLeft, CalendarPlus } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { submitPaymentProof } from "@/app/actions/committee";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-status-labels";
import { buildAlipayTransferLink } from "@/lib/alipay-deeplink";
import { FileUpload } from "@/components/upload/file-upload";

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

  // GERBANG PEMBAYARAN: acara berbayar baru menampilkan QR check-in setelah
  // bendahara memverifikasi bukti transfer. Sebelum itu yang tampil panduan
  // bayarnya - pendaftarannya sendiri berstatus "pending" tanpa QR.
  const hasFee = event.isPaid;
  const awaitingPayment = hasFee && registration.paymentStatus !== "verified";
  const gated = registration.status === "pending" || awaitingPayment;
  // Nominal = kategori tarif yang dipilih peserta bila ada, kalau tidak tarif
  // tunggal acara.
  const [feeOption] = registration.feeOptionId
    ? await db
        .select({ label: eventFeeOptions.label, amountCny: eventFeeOptions.amountCny })
        .from(eventFeeOptions)
        .where(eq(eventFeeOptions.id, registration.feeOptionId))
    : [];
  const feeAmount = feeOption
    ? feeOption.amountCny
    : event.feeCny != null && event.feeCny > 0
      ? event.feeCny
      : null;
  const alipayLink =
    feeAmount != null && event.alipayUid
      ? buildAlipayTransferLink(event.alipayUid, feeAmount, `${session.user.name ?? "Peserta"} - ${event.title}`)
      : null;
  const alipayQrDataUrl = alipayLink ? await QRCode.toDataURL(alipayLink, { margin: 1, width: 200 }) : null;

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
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${gated ? "bg-surface-container-low" : "bg-primary-container/10"}`}>
          {gated ? (
            <CalendarDays className="text-on-surface-variant" size={28} aria-hidden="true" />
          ) : (
            <CheckCircle2 className="text-primary-container" size={28} aria-hidden="true" />
          )}
        </div>
        <div role="status" aria-live="polite">
          <h1 className="text-headline-lg text-on-background mb-2">
            {gated ? t("ticket.pendingTitle") : t("ticket.success")}
          </h1>
          <p className="text-body-md text-on-surface-variant mb-10">
            {gated
              ? t("ticket.pendingDesc")
              : t("ticket.successDesc", { name: session.user.name?.split(" ")[0] ?? "" })}
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          {gated ? (
            <div className="mb-6 text-left text-body-sm text-on-surface-variant flex flex-col gap-1.5">
              <p>1. Bayar sesuai instruksi di bawah.</p>
              <p>2. Unggah bukti transfer.</p>
              <p>3. Bendahara memverifikasi — QR check-in muncul otomatis di halaman ini.</p>
            </div>
          ) : (
            <>
              <Image
                src={qrDataUrl}
                alt={t("ticket.qrAlt", { title: event.title })}
                width={240}
                height={240}
                unoptimized
                className="mx-auto mb-6 rounded-lg"
              />
              <div className="flex flex-col items-center gap-2 mb-4">
                <p className="text-label-caps text-on-surface-variant">{t("ticket.checkinToken")}</p>
                <code className="bg-surface-container-low px-3 py-1.5 rounded-md text-body-sm break-all select-all">{token}</code>
                <CopyButton value={token} label={t("ticket.copyToken")} />
              </div>
            </>
          )}
          <h2 className="text-headline-md text-on-background mb-3">{event.title}</h2>

          {calUrl && !gated && (
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-surface-container-low transition-colors mb-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              <CalendarPlus size={16} aria-hidden="true" /> {t("ticket.addCalendar")}
            </a>
          )}

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

        {hasFee && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mt-6 text-left">
            <h2 className="text-headline-sm text-on-background mb-2">Pembayaran</h2>
            <p className="text-body-md text-on-background mb-1">
              {feeAmount != null
                ? `Biaya: ¥${feeAmount}${feeOption ? ` · ${feeOption.label}` : ""}`
                : "Nominal biaya belum ditentukan, tunggu info dari panitia."}
            </p>
            {event.paymentInstructions && (
              <p className="text-body-sm text-on-surface-variant whitespace-pre-line mb-4">{event.paymentInstructions}</p>
            )}
            {event.paymentQrUrl && registration.paymentStatus !== "verified" && (
              <div className="flex flex-col items-center gap-2 mb-4 py-4 border-y border-outline-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.paymentQrUrl}
                  alt="QR Alipay bendahara acara"
                  width={200}
                  height={200}
                  className="rounded-lg border border-outline-variant bg-white p-1"
                />
                <p className="text-xs text-on-surface-variant text-center max-w-xs">
                  Scan QR Alipay di atas dengan app Alipay, transfer sejumlah biaya, lalu unggah buktinya di bawah.
                </p>
              </div>
            )}
            {alipayQrDataUrl && alipayLink && (
              <div className="flex flex-col items-center gap-2 mb-4 py-4 border-y border-outline-variant">
                <Image
                  src={alipayQrDataUrl}
                  alt="QR pembayaran Alipay dengan nominal terisi otomatis"
                  width={160}
                  height={160}
                  unoptimized
                  className="rounded-lg"
                />
                <p className="text-xs text-on-surface-variant text-center max-w-xs">
                  Scan pakai app Alipay dari HP lain, atau kalau lagi buka halaman ini di HP sendiri, langsung
                  ketuk tombol di bawah.
                </p>
                <a
                  href={alipayLink}
                  className="inline-flex items-center justify-center border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2 rounded-md hover:bg-surface-container-low transition-colors"
                >
                  Buka Alipay (nominal &amp; catatan sudah terisi)
                </a>
                <p className="text-xs text-on-surface-variant text-center max-w-xs">
                  Kalau tombolnya tidak terbuka (mis. dari browser dalam app WeChat), bayar manual sesuai instruksi
                  di atas — tetap unggah buktinya di bawah.
                </p>
              </div>
            )}
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-3">
              Status: {PAYMENT_STATUS_LABEL[registration.paymentStatus] ?? registration.paymentStatus}
            </p>
            {registration.paymentStatus === "submitted" && (
              <p className="mb-3 flex items-start gap-2 rounded-md bg-primary-container/10 px-4 py-3 text-body-sm text-on-background">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary-container" aria-hidden="true" />
                <span>
                  Bukti transfer sudah terkirim. Bendahara akan memverifikasi — QR check-in muncul otomatis di
                  halaman ini setelah disetujui. Kamu bisa memperbarui bukti di bawah bila perlu.
                </span>
              </p>
            )}
            {registration.paymentStatus === "rejected" && (
              <p className="mb-3 flex items-start gap-2 rounded-md bg-error-container/40 px-4 py-3 text-body-sm text-on-error-container">
                <span aria-hidden="true">⚠️</span>
                <span>
                  Bukti sebelumnya belum bisa diverifikasi{registration.paymentNote ? ` — ${registration.paymentNote}` : ""}.
                  Kirim ulang bukti transfer yang benar di bawah.
                </span>
              </p>
            )}
            {registration.paymentStatus !== "verified" && (
              <form action={submitPaymentProof} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={registration.id} />
                <input type="hidden" name="slug" value={slug} />
                <FileUpload
                  name="proofUrl"
                  folder="payment-proof"
                  required
                  autoUpload
                  defaultValue={registration.paymentProofUrl ?? ""}
                  accept="image/*"
                  label={gated ? "Bukti transfer (screenshot)" : "Perbarui bukti transfer (screenshot)"}
                />
                <button
                  type="submit"
                  className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
                >
                  Kirim Bukti
                </button>
              </form>
            )}
          </div>
        )}

        {event.confirmationInfo && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mt-6 text-left">
            <h2 className="text-headline-sm text-on-background mb-2">Langkah Berikutnya</h2>
            <p className="text-body-md text-on-surface-variant whitespace-pre-line">{event.confirmationInfo}</p>
          </div>
        )}

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
