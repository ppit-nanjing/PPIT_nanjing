import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events, eventRegistrations, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { createNotification } from "@/lib/notifications";
import { CheckCircle2, XCircle, UserRound, ScanLine, ArrowLeft } from "lucide-react";

interface ScanResult {
  ok: boolean;
  already: boolean;
  name: string | null;
  email: string | null;
  checkedInAt?: string;
}

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

  let result: ScanResult | null = null;

  if (t) {
    const [row] = await db
      .select({ reg: eventRegistrations, name: users.name, email: users.email })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .where(and(eq(eventRegistrations.eventId, id), eq(eventRegistrations.qrCodeToken, t)));

    if (!row) {
      result = { ok: false, already: false, name: null, email: null };
    } else if (row.reg.status === "attended") {
      result = {
        ok: true,
        already: true,
        name: row.name,
        email: row.email,
        checkedInAt: row.reg.checkedInAt?.toISOString(),
      };
    } else {
      await db
        .update(eventRegistrations)
        .set({ status: "attended", checkedInAt: new Date() })
        .where(eq(eventRegistrations.id, row.reg.id));

      if (row.reg.userId) {
        await createNotification({
          userId: row.reg.userId,
          title: "Kehadiran terkonfirmasi",
          body: `Kehadiran kamu di "${event.title}" telah dicatat. Terima kasih sudah hadir!`,
          relatedEntityType: "event_registration",
          relatedEntityId: row.reg.id,
        });
      }

      result = { ok: true, already: false, name: row.name, email: row.email };
    }
  }

  const registeredRows = await db
    .select({ status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, id));
  const registeredCount = registeredRows.length;
  const attendedCount = registeredRows.filter((r) => r.status === "attended").length;

  return (
    <div className="px-8 py-10 max-w-xl">
      <a
        href={`/console/events/${id}`}
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} /> Kembali ke Kegiatan
      </a>

      <h1 className="text-headline-lg text-on-background mb-1">{event.title}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Scan QR tiket peserta untuk mencatat kehadiran.
      </p>

      {result && (
        <div
          className={`mb-8 rounded-xl border p-6 flex flex-col items-center text-center ${
            result.ok
              ? "bg-surface-container-lowest border-outline-variant"
              : "bg-surface-container-lowest border-red-300"
          }`}
        >
          {!result.ok ? (
            <XCircle className="text-red-500 mb-3" size={40} />
          ) : (
            <CheckCircle2 className="text-primary-container mb-3" size={40} />
          )}

          {!result.ok ? (
            <p className="text-body-lg text-on-background font-semibold">Token tidak valid</p>
          ) : (
            <>
              <p className="text-body-lg text-on-background font-semibold mb-1">
                {result.already ? "Sudah check-in sebelumnya" : "Check-in berhasil"}
              </p>
              <div className="flex items-center gap-2 text-on-surface-variant mt-2">
                <UserRound size={16} />
                <span className="text-body-md">{result.name ?? "(tanpa nama)"}</span>
              </div>
              {result.email && <p className="text-label-caps text-on-surface-variant">{result.email}</p>}
              {result.already && result.checkedInAt && (
                <p className="text-label-caps text-on-surface-variant mt-1">
                  Hadir pada {new Date(result.checkedInAt).toLocaleString("id-ID")}
                </p>
              )}
            </>
          )}

          <a
            href={`/console/events/${id}/scan`}
            className="mt-5 inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <ScanLine size={16} /> Scan Berikutnya
          </a>
        </div>
      )}

      {!result && (
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
