import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { events, eventRegistrations, eventCommittee, eventDivisions, users, sensusProfiles } from "@/db/schema";
import { requireEventCapability } from "@/lib/event-access";
import { EVENT_COMMITTEE_ROLE_LABEL, type EventCommitteeRole } from "@/lib/event-capabilities";
import { checkInClosedReason, CHECK_IN_CLOSED_MESSAGE } from "@/lib/event-checkin";
import { WIF_2026_KELOMPOK, normalizeNameForKelompok } from "@/lib/wif-2026-kelompok";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ScanCheckIn } from "@/components/console/scan-checkin";
import { QrScanner } from "@/components/console/qr-scanner";
import { ManualCheckIn } from "@/components/console/manual-checkin";
import { XCircle, ArrowLeft, CalendarX, FlaskConical } from "lucide-react";

// Scanner kehadiran — pindah keluar dari /console supaya Petugas Pendataan yang
// hanya panitia acara (bukan admin kabinet) bisa membukanya. Gerbangnya di sini
// sendiri: event.scanAttendance (grant "Pendataan / scan" per divisi), bukan
// lewat console/layout.tsx.
export default async function EventScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; practice?: string }>;
}) {
  const { slug } = await params;
  const { t, practice } = await searchParams;
  // "Mode Latihan" - scan tiket ASLI (QR peserta/panitia sungguhan) lewat
  // validasi asli yang sama, tapi tidak menulis kehadiran/notifikasi. Per
  // acara lewat query param, bukan flag global - supaya panitia bisa
  // meyakinkan diri (dan peserta yang khawatir) QR mereka memang bisa
  // discan, tanpa risiko ke data kehadiran/kapasitas sungguhan.
  const practiceMode = practice === "1";

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();

  // requireEventCapability sudah menggerbangi ini lebih ketat daripada gerbang
  // draft/scheduled halaman publik (butuh capability event.scanAttendance
  // eksplisit, bukan cuma "sudah login") - jadi panitia acara ini tetap bisa
  // scan absensi walau acaranya masih draft (mis. uji coba pendaftaran).
  const access = await requireEventCapability(event.id, "event.scanAttendance");

  // Read-only lookup only - the actual check-in mutation happens in the
  // ScanCheckIn client component (server action), never during this render.
  // Satu token bisa berasal dari tiket PESERTA (event_registrations) atau tiket
  // KEPANITIAAN (event_committee.attendance_token) - peserta dicoba lebih dulu,
  // karena jauh lebih sering discan.
  let lookup:
    | { kind: "participant"; name: string | null; email: string | null; alreadyAttended: boolean; label: null; kelompok: { kelompok: number; warna: string } | null }
    | { kind: "committee"; name: string | null; email: string | null; alreadyAttended: boolean; label: string | null; kelompok: null }
    | null = null;

  // Kelompok/warna WIF 2026 - lookup statis, khusus acara ini (lihat
  // src/lib/wif-2026-kelompok.ts), jangan ikut acara lain.
  const isWif2026 = event.slug === "wif-2026";

  if (t) {
    const [row] = await db
      .select({ name: users.name, email: users.email, status: eventRegistrations.status, sensusFullName: sensusProfiles.fullName })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(sensusProfiles, eq(eventRegistrations.userId, sensusProfiles.userId))
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.qrCodeToken, t)));

    if (row) {
      const nameForKelompok = row.sensusFullName ?? row.name ?? "";
      const kelompokEntry = isWif2026 ? WIF_2026_KELOMPOK[normalizeNameForKelompok(nameForKelompok)] ?? null : null;
      lookup = {
        kind: "participant",
        name: row.name,
        email: row.email,
        alreadyAttended: row.status === "attended",
        label: null,
        kelompok: kelompokEntry ? { kelompok: kelompokEntry.kelompok, warna: kelompokEntry.warna } : null,
      };
    } else {
      const [committee] = await db
        .select({
          name: users.name,
          email: users.email,
          checkedInAt: eventCommittee.checkedInAt,
          role: eventCommittee.role,
          divisionName: eventDivisions.name,
        })
        .from(eventCommittee)
        .leftJoin(users, eq(eventCommittee.userId, users.id))
        .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
        .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.attendanceToken, t)))
        .limit(1);
      if (committee) {
        const roleLabel = EVENT_COMMITTEE_ROLE_LABEL[committee.role as EventCommitteeRole] ?? committee.role;
        lookup = {
          kind: "committee",
          name: committee.name,
          email: committee.email,
          alreadyAttended: !!committee.checkedInAt,
          label: `${committee.divisionName ? `${committee.divisionName} · ` : ""}${roleLabel}`,
          kelompok: null,
        };
      }
    }
  }

  const registeredRows = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, event.id));
  // Kecualikan yang dibatalkan - sama seperti getEventSeats() (halaman publik)
  // dan activeRegistrationCount (console/events/[id]) - baris cancelled tidak
  // boleh ikut dihitung "terdaftar".
  const registeredCount = registeredRows.filter((r) => r.status !== "cancelled").length;
  const attendedCount = registeredRows.filter((r) => r.status === "attended").length;

  const committeeRows = await db
    .select({ checkedInAt: eventCommittee.checkedInAt })
    .from(eventCommittee)
    .where(eq(eventCommittee.eventId, event.id));
  const committeeTotal = committeeRows.length;
  const committeeAttended = committeeRows.filter((c) => c.checkedInAt).length;

  const scanPath = `/events/${slug}/scan${practiceMode ? "?practice=1" : ""}`;
  const toggleHref = practiceMode ? `/events/${slug}/scan` : `/events/${slug}/scan?practice=1`;
  // Pintu check-in menutup otomatis setelah acara berakhir (Spesifikasi §11).
  // BPH Kabinet / Divisi Teknologi (isFullAdmin) dikecualikan — tetap bisa
  // mengoreksi kehadiran kapan pun, konsisten dengan kunci 2-minggu.
  const closed = access.isFullAdmin ? null : checkInClosedReason(event);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-xl mx-auto px-[var(--spacing-container-padding)] py-10 lg:py-14">
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Acara
        </Link>

        <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-1">{event.title}</h1>
        <p className="text-body-md text-on-surface-variant mb-4">
          Scan QR tiket peserta atau tiket kepanitiaan untuk mencatat kehadiran.
        </p>

        {!closed && practiceMode && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
            <FlaskConical className="text-amber-600 shrink-0 mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="text-body-md font-semibold text-amber-900">
                Mode Latihan aktif — scan TIDAK akan tercatat sebagai kehadiran sungguhan
              </p>
              <p className="text-body-sm text-amber-800 mt-0.5">
                Aman dipakai untuk mencoba QR tiket asli (punya panitia atau peserta) supaya yakin bisa discan saat
                acara berlangsung.
              </p>
              <Link href={toggleHref} className="inline-block mt-2 text-label-caps uppercase tracking-wide text-amber-900 underline">
                Matikan Mode Latihan
              </Link>
            </div>
          </div>
        )}
        {!closed && !practiceMode && (
          <div className="mb-6">
            <Link
              href={toggleHref}
              className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background border border-outline-variant rounded-md px-3 py-2 transition-colors"
            >
              <FlaskConical size={14} aria-hidden="true" /> Aktifkan Mode Latihan
            </Link>
          </div>
        )}

        {closed ? (
          <div className="mb-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex flex-col items-center text-center">
            <CalendarX className="text-on-surface-variant mb-3" size={40} aria-hidden="true" />
            <p className="text-body-lg text-on-background font-semibold mb-1">
              {closed === "cancelled" ? "Acara dibatalkan" : "Check-in ditutup"}
            </p>
            <p className="text-body-md text-on-surface-variant max-w-sm">{CHECK_IN_CLOSED_MESSAGE[closed]}</p>
          </div>
        ) : (
          <>
            {t && lookup && (
              <ScanCheckIn
                token={t}
                eventId={event.id}
                kind={lookup.kind}
                name={lookup.name}
                email={lookup.email}
                label={lookup.label}
                scanPath={scanPath}
                practice={practiceMode}
                kelompok={lookup.kelompok}
              />
            )}

            {t && !lookup && (
              <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
                <XCircle className="text-red-500 mb-3" size={40} aria-hidden="true" />
                <p className="text-body-lg text-on-background font-semibold">Token tidak valid</p>
              </div>
            )}

            {!t && <QrScanner practiceMode={practiceMode} />}

            <form method="get" className="flex flex-col gap-3 sm:flex-row">
              {practiceMode && <input type="hidden" name="practice" value="1" />}
              <input
                name="t"
                placeholder="Tempel/salin token QR manual"
                className="flex-1 bg-soft-gray rounded-md p-3 text-body-md"
              />
              <button
                type="submit"
                className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
              >
                Cek Token
              </button>
            </form>

            {!t && <ManualCheckIn eventId={event.id} practice={practiceMode} />}
          </>
        )}

        <p className="text-label-caps text-on-surface-variant mt-8">
          {registeredCount} terdaftar &middot; {attendedCount} hadir
          {committeeTotal > 0 && (
            <>
              {" "}&middot; {committeeTotal} panitia &middot; {committeeAttended} panitia hadir
            </>
          )}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
