import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { events, eventRegistrations, eventCommittee, eventDivisions, users } from "@/db/schema";
import { requireEventCapability } from "@/lib/event-access";
import { EVENT_COMMITTEE_ROLE_LABEL, type EventCommitteeRole } from "@/lib/event-capabilities";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ScanCheckIn } from "@/components/console/scan-checkin";
import { QrScanner } from "@/components/console/qr-scanner";
import { XCircle, ArrowLeft } from "lucide-react";

// Scanner kehadiran — pindah keluar dari /console supaya Petugas Pendataan yang
// hanya panitia acara (bukan admin kabinet) bisa membukanya. Gerbangnya di sini
// sendiri: event.scanAttendance (grant "Pendataan / scan" per divisi), bukan
// lewat console/layout.tsx.
export default async function EventScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event) notFound();
  // Belum dirilis = tidak terjangkau, sama seperti halaman acara publik.
  if (event.status === "scheduled" || event.status === "draft") notFound();

  await requireEventCapability(event.id, "event.scanAttendance");

  // Read-only lookup only - the actual check-in mutation happens in the
  // ScanCheckIn client component (server action), never during this render.
  // Satu token bisa berasal dari tiket PESERTA (event_registrations) atau tiket
  // KEPANITIAAN (event_committee.attendance_token) - peserta dicoba lebih dulu,
  // karena jauh lebih sering discan.
  let lookup:
    | { kind: "participant"; name: string | null; email: string | null; alreadyAttended: boolean; label: null }
    | { kind: "committee"; name: string | null; email: string | null; alreadyAttended: boolean; label: string | null }
    | null = null;

  if (t) {
    const [row] = await db
      .select({ name: users.name, email: users.email, status: eventRegistrations.status })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.qrCodeToken, t)));

    if (row) {
      lookup = { kind: "participant", name: row.name, email: row.email, alreadyAttended: row.status === "attended", label: null };
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
        };
      }
    }
  }

  const registeredRows = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, event.id));
  const registeredCount = registeredRows.length;
  const attendedCount = registeredRows.filter((r) => r.status === "attended").length;

  const committeeRows = await db
    .select({ checkedInAt: eventCommittee.checkedInAt })
    .from(eventCommittee)
    .where(eq(eventCommittee.eventId, event.id));
  const committeeTotal = committeeRows.length;
  const committeeAttended = committeeRows.filter((c) => c.checkedInAt).length;

  const scanPath = `/events/${slug}/scan`;

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
        <p className="text-body-md text-on-surface-variant mb-8">
          Scan QR tiket peserta atau tiket kepanitiaan untuk mencatat kehadiran.
        </p>

        {t && lookup && (
          <ScanCheckIn
            token={t}
            eventId={event.id}
            kind={lookup.kind}
            name={lookup.name}
            email={lookup.email}
            label={lookup.label}
            scanPath={scanPath}
          />
        )}

        {t && !lookup && (
          <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
            <XCircle className="text-red-500 mb-3" size={40} aria-hidden="true" />
            <p className="text-body-lg text-on-background font-semibold">Token tidak valid</p>
          </div>
        )}

        {!t && <QrScanner />}

        <form method="get" className="flex flex-col gap-3 sm:flex-row">
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
