import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventCommittee, eventDivisions } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
import { BadgeCheck, ArrowLeft, ScanLine, CalendarDays, MapPin } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
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

// Tiket kepanitiaan: QR absensi untuk orang yang ditugaskan di acara ini,
// setara tiket peserta di ../ticket - tanpa gerbang pembayaran, karena
// kepanitiaan tidak mendaftar lewat alur pendaftaran peserta.
export default async function CommitteeTicketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent(`/events/${slug}/committee`)}`);

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();
  // Sama dengan halaman detail publik: yang belum dirilis tidak terjangkau.
  if (event.status === "scheduled" || event.status === "draft") notFound();

  const [assignment] = await db
    .select({
      id: eventCommittee.id,
      role: eventCommittee.role,
      checkedInAt: eventCommittee.checkedInAt,
      attendanceToken: eventCommittee.attendanceToken,
      divisionName: eventDivisions.name,
    })
    .from(eventCommittee)
    .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
    .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, session.user.id)))
    .limit(1);

  // Bukan panitia acara ini - bukan urusannya di sini.
  if (!assignment) redirect(`/events/${slug}`);

  // Token dibuat saat pertama kali dibutuhkan (lazy) supaya penugasan lama -
  // sebelum kolom ini ada - tetap otomatis punya QR tanpa backfill data.
  let token = assignment.attendanceToken;
  if (!token) {
    token = randomUUID();
    await db.update(eventCommittee).set({ attendanceToken: token }).where(eq(eventCommittee.id, assignment.id));
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const checkInUrl = `${origin}/console/events/${event.id}/scan?t=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { margin: 1, width: 240 });

  const title = `${ROLE_LABEL[assignment.role] ?? assignment.role}${assignment.divisionName ? ` ${assignment.divisionName}` : ""}`;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary-container/10">
          <BadgeCheck className="text-primary-container" size={28} aria-hidden="true" />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">Tiket Kepanitiaan</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          Tunjukkan QR ini ke panitia pendataan untuk dicatat kehadirannya sebagai pengurus acara.
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          <Image
            src={qrDataUrl}
            alt={`QR absensi kepanitiaan ${event.title}`}
            width={240}
            height={240}
            unoptimized
            className="mx-auto mb-6 rounded-lg"
          />
          <p className="text-headline-sm text-on-background font-medium mb-1">{title}</p>
          <p className="text-body-md text-on-surface-variant mb-4">{session.user.name}</p>
          <div className="flex flex-col items-center gap-2 mb-6">
            <p className="text-label-caps text-on-surface-variant">Token absensi</p>
            <code className="bg-surface-container-low px-3 py-1.5 rounded-md text-body-sm break-all select-all">{token}</code>
            <CopyButton value={token} label="Salin token" />
          </div>
          <div
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-full ${
              assignment.checkedInAt ? "bg-primary-container/40 text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            <ScanLine size={14} aria-hidden />
            {assignment.checkedInAt
              ? `Hadir · ${new Date(assignment.checkedInAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}`
              : "Belum check-in"}
          </div>

          <h2 className="text-headline-md text-on-background mt-8 mb-3">{event.title}</h2>
          <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant items-center">
            {event.startAt && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" />{" "}
                {new Date(event.startAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" /> {event.location}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/events/${slug}`}
          className="mt-8 inline-flex items-center justify-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Acara
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
