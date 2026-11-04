import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, ScanLine } from "lucide-react";
import { EventPanelJump } from "@/components/console/event-admin-panel";
import { EventCapacityMeter } from "@/components/console/event-capacity-meter";
import { EventStatusMark, type EventStatusTone } from "@/components/console/event-status-mark";
import type { EventLifecycleStep } from "@/lib/event-stage";

// Kepala halaman acara di konsol: cermin kepala halaman publik (/events/[slug]: sampul,
// judul, tanggal, lokasi), dilanjutkan angka dan tahap acara yang hanya perlu panitia.

const LEDGER_COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

function LedgerCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface-container-lowest px-5 py-4 last:odd:col-span-2 lg:last:odd:col-span-1">
      <p className="text-body-sm text-on-surface-variant">{label}</p>
      {children}
    </div>
  );
}

export function EventConsoleHeader({
  title,
  coverImageUrl,
  category,
  sensusOnly,
  chipLabel,
  chipTone,
  dateLabel,
  location,
  registered,
  attended,
  capacity,
  finalAttendeeCount,
  committee,
  queue,
  steps,
  publicHref,
  scanHref,
  scanIsPrimary,
}: {
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  sensusOnly: boolean;
  chipLabel: string;
  chipTone: EventStatusTone;
  dateLabel: string | null;
  location: string | null;
  registered: number;
  attended: number;
  capacity: number | null;
  finalAttendeeCount: number | null;
  /** Null = akun ini tidak mengelola kepanitiaan. */
  committee: { members: number; divisions: number } | null;
  /** Null = akun ini tidak memegang antrean apa pun. */
  queue: { payments: number; volunteers: number } | null;
  steps: EventLifecycleStep[];
  publicHref: string | null;
  scanHref: string | null;
  scanIsPrimary: boolean;
}) {
  const left = capacity != null ? Math.max(capacity - registered, 0) : null;
  const waiting = queue ? queue.payments + queue.volunteers : 0;
  const queueParts = queue
    ? [queue.payments > 0 && `${queue.payments} bukti bayar`, queue.volunteers > 0 && `${queue.volunteers} volunteer`].filter(Boolean)
    : [];
  const cellCount = 2 + (committee ? 1 : 0) + (queue ? 1 : 0);
  const current = steps.find((step) => step.state === "current");

  return (
    <header>
      {/* Di HP pemindai memakai satu baris penuh: di pintu acara, inilah tombol yang dicari. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-3">
        <Link
          href="/console/events"
          className="mr-auto inline-flex items-center gap-2 rounded text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:text-on-background"
        >
          <ArrowLeft size={16} aria-hidden /> Semua Kegiatan
        </Link>
        {publicHref && (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low"
          >
            <span>
              <span className="hidden sm:inline">Halaman </span>Publik
            </span>
            <ExternalLink size={14} aria-hidden />
          </a>
        )}
        {scanHref && (
          <a
            href={scanHref}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-label-caps uppercase tracking-wide transition-colors lg:w-auto ${
              scanIsPrimary
                ? "bg-primary-container text-on-primary hover:bg-primary"
                : "border border-outline-variant text-on-background hover:bg-surface-container-low"
            }`}
          >
            <ScanLine size={15} aria-hidden /> Scanner Check-in
          </a>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-outline-variant">
        <div className={`relative isolate flex flex-col justify-end bg-band ${coverImageUrl ? "min-h-64 lg:min-h-72" : ""}`}>
          {coverImageUrl && (
            <>
              <Image src={coverImageUrl} alt="" fill priority sizes="(max-width: 1024px) 100vw, 1100px" className="-z-10 object-cover" />
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/10" />
            </>
          )}
          <div className="flex flex-col gap-3 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusMark label={chipLabel} tone={chipTone} />
              {category && (
                <span className="rounded bg-white/15 px-2 py-1 text-label-caps uppercase tracking-wide text-on-band">{category}</span>
              )}
              {sensusOnly && (
                <span className="rounded bg-white/15 px-2 py-1 text-label-caps uppercase tracking-wide text-on-band">Khusus peserta tersensus</span>
              )}
            </div>
            <h1 className="max-w-3xl text-headline-md text-on-band sm:text-headline-lg">{title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-on-band">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={15} aria-hidden /> {dateLabel ?? "Tanggal belum diisi"}
              </span>
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} aria-hidden /> {location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-px border-t border-outline-variant bg-outline-variant ${LEDGER_COLUMNS[cellCount] ?? ""}`}>
          <LedgerCell label="Terdaftar">
            <p className="tabular-nums text-on-background">
              <span className="text-headline-md">{registered}</span>
              {capacity != null && <span className="text-body-sm text-on-surface-variant"> / {capacity}</span>}
            </p>
            <EventCapacityMeter registered={registered} capacity={capacity} className="mt-1" />
            <p className="text-body-sm tabular-nums text-on-surface-variant">
              {left == null ? "Tanpa batas kuota" : left === 0 ? "Kuota penuh" : `${left} sisa`}
            </p>
          </LedgerCell>
          <LedgerCell label="Hadir">
            <p className="text-headline-md tabular-nums text-on-background">{attended}</p>
            <p className="text-body-sm tabular-nums text-on-surface-variant">
              {finalAttendeeCount != null ? `Angka final ${finalAttendeeCount}` : "Dari check-in QR"}
            </p>
          </LedgerCell>
          {committee && (
            <LedgerCell label="Panitia">
              <p className="text-headline-md tabular-nums text-on-background">{committee.members}</p>
              <p className="text-body-sm tabular-nums text-on-surface-variant">{committee.divisions} divisi</p>
            </LedgerCell>
          )}
          {queue && (
            <LedgerCell label="Menunggu Keputusan">
              <p className={`text-headline-md tabular-nums ${waiting > 0 ? "text-gold-ink" : "text-on-background"}`}>{waiting}</p>
              {waiting > 0 ? (
                <EventPanelJump tab="internal" className="self-start text-left text-body-sm text-primary-container underline underline-offset-2 hover:text-primary">
                  {queueParts.join(", ")}
                </EventPanelJump>
              ) : (
                <p className="text-body-sm text-on-surface-variant">Tidak ada antrean</p>
              )}
            </LedgerCell>
          )}
        </div>

        <div className="border-t border-outline-variant bg-surface-container-lowest px-5 py-4">
          {steps.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Acara ini dibatalkan.</p>
          ) : (
            <>
              <ol aria-label="Tahap acara" className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {steps.map((step) => (
                  <li key={step.stage} aria-current={step.state === "current" ? "step" : undefined} className="min-w-0">
                    <span aria-hidden className={`block h-1 rounded-full ${step.state === "next" ? "bg-surface-container-high" : "bg-gold-ink"}`} />
                    <span className={`mt-2 hidden text-body-sm sm:block ${step.state === "current" ? "font-semibold text-on-background" : "text-on-surface-variant"}`}>
                      {step.label}
                    </span>
                    {step.note && <span className="hidden text-body-sm tabular-nums text-on-surface-variant lg:block">{step.note}</span>}
                  </li>
                ))}
              </ol>
              {current && (
                <p className="mt-2 text-body-sm text-on-surface-variant sm:hidden">
                  <span className="font-semibold text-on-background">{current.label}</span>
                  {current.note && ` · ${current.note}`}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
