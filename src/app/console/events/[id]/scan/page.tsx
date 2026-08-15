import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, eventRegistrations, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { ScanCheckIn } from "@/components/console/scan-checkin";
import { XCircle, ScanLine, ArrowLeft } from "lucide-react";

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
  let lookup: { name: string | null; email: string | null; alreadyAttended: boolean } | null = null;

  if (t) {
    const [row] = await db
      .select({ name: users.name, email: users.email, status: eventRegistrations.status })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.qrCodeToken, t)));

    if (row) {
      lookup = { name: row.name, email: row.email, alreadyAttended: row.status === "attended" };
    }
  }

  const registeredRows = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, id));
  const registeredCount = registeredRows.length;
  const attendedCount = registeredRows.filter((r) => r.status === "attended").length;

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
        Scan QR tiket peserta untuk mencatat kehadiran.
      </p>

      {t && lookup && (
        <ScanCheckIn token={t} eventId={id} name={lookup.name} email={lookup.email} />
      )}

      {t && !lookup && (
        <div className="mb-8 rounded-xl border border-red-300 bg-surface-container-lowest p-6 flex flex-col items-center text-center">
          <XCircle className="text-red-500 mb-3" size={40} />
          <p className="text-body-lg text-on-background font-semibold">Token tidak valid</p>
        </div>
      )}

      {!t && (
        <div className="mb-8 flex flex-col items-center justify-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-10 text-center">
          <ScanLine className="text-outline-variant mb-3" size={48} />
          <p className="text-body-md text-on-surface-variant">
            Arahkan kamera ponsel panitia ke QR tiket peserta, atau masukkan token di bawah ini.
          </p>
        </div>
      )}

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
      </p>
    </div>
  );
}
