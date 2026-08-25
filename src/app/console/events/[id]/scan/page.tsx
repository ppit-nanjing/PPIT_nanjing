import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, eventRegistrations, eventCommittee, eventDivisions, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ScanCheckIn } from "@/components/console/scan-checkin";
import { QrScanner } from "@/components/console/qr-scanner";
import { XCircle, ArrowLeft } from "lucide-react";

export default async function EventScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  await requireModuleAccess("events");
  const { id } = await params;
  const { t } = await searchParams;

  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event) notFound();

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
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.qrCodeToken, t)));

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
        .where(and(eq(eventCommittee.eventId, id), eq(eventCommittee.attendanceToken, t)))
        .limit(1);
      if (committee) {
        lookup = {
          kind: "committee",
          name: committee.name,
          email: committee.email,
          alreadyAttended: !!committee.checkedInAt,
          label: `${committee.divisionName ? `${committee.divisionName} · ` : ""}${committee.role}`,
        };
      }
    }
  }

  const registeredRows = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, id));
  const registeredCount = registeredRows.length;
  const attendedCount = registeredRows.filter((r) => r.status === "attended").length;

  const committeeRows = await db
    .select({ checkedInAt: eventCommittee.checkedInAt })
    .from(eventCommittee)
    .where(eq(eventCommittee.eventId, id));
  const committeeTotal = committeeRows.length;
  const committeeAttended = committeeRows.filter((c) => c.checkedInAt).length;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-xl">
      <a
        href={`/console/events/${id}`}
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Kembali ke Kegiatan
      </a>

      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-1">{event.title}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Scan QR tiket peserta atau tiket kepanitiaan untuk mencatat kehadiran.
      </p>

      {t && lookup && (
        <ScanCheckIn
          token={t}
          eventId={id}
          kind={lookup.kind}
          name={lookup.name}
          email={lookup.email}
          label={lookup.label}
        />
      )}

      {t && !lookup && (
        <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
          <XCircle className="text-red-500 mb-3" size={40} />
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
            {" "}· {committeeTotal} panitia &middot; {committeeAttended} panitia hadir
          </>
        )}
      </p>
    </div>
  );
}
