import Image from "next/image";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EventCapacityMeter } from "@/components/console/event-capacity-meter";

// Kartu cuplikan dashboard konsol: satu kartu per modul, seluruh kartu adalah tautan ke
// modulnya (tautan judul membentang lewat ::after). Isi yang punya tujuan sendiri, seperti
// baris acara, memakai tautannya sendiri di lapisan atas (relative z-10). Semua angka sudah
// dihitung server; komponen ini hanya menata.

export function DashboardCard({
  id,
  title,
  href,
  linkLabel,
  figure,
  figureLabel,
  note,
  noteTone = "muted",
  className = "",
  children,
}: {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  figure?: number | string;
  figureLabel?: string;
  /** Satu kalimat di bawah angka: temuan, status, atau pembanding. */
  note?: ReactNode;
  noteTone?: "muted" | "positive" | "alarm";
  className?: string;
  children?: ReactNode;
}) {
  const noteClass =
    noteTone === "alarm" ? "text-error" : noteTone === "positive" ? "text-primary-container" : "text-on-surface-variant";
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={`group relative flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold focus-within:border-muted-gold motion-reduce:transition-none ${className}`}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1.5">
          <h2 id={`${id}-title`} className="text-headline-sm text-on-background">
            <Link
              href={href}
              className="rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
            >
              {title}
            </Link>
          </h2>
          {figure !== undefined && (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-headline-md tabular-nums text-on-background">{figure}</span>
              {figureLabel && <span className="text-body-sm text-on-surface-variant">{figureLabel}</span>}
            </p>
          )}
          {note && <p className={`text-body-sm ${noteClass}`}>{note}</p>}
        </div>
        {children}
      </div>
      <p
        aria-hidden="true"
        className="flex items-center gap-1.5 border-t border-outline-variant px-5 py-3 text-body-sm text-primary-container"
      >
        {linkLabel}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
      </p>
    </section>
  );
}

export type AttentionItem = { icon: LucideIcon; label: string; count: number; href: string; alarm?: boolean };

/** Antrean yang menunggu keputusan: satu baris per jenis, angkanya di kanan, seluruh baris membuka modulnya. */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section aria-labelledby="perlu-tindakan" className="mb-8">
      <h2 id="perlu-tindakan" className="mb-3 text-headline-sm text-on-background">
        Perlu Tindakan
      </h2>
      {items.length === 0 ? (
        <p className="rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-4 text-body-md text-on-surface-variant">
          Tidak ada yang menunggu tindakanmu.
        </p>
      ) : (
        <ul
          className={`grid rounded-lg border border-outline-variant bg-surface-container-lowest px-5 ${
            items.length > 1 ? "lg:grid-cols-2 lg:gap-x-10" : ""
          }`}
        >
          {items.map((a) => (
            <li key={a.label} className="border-t border-outline-variant first:border-t-0 lg:[&:nth-child(2)]:border-t-0">
              <Link
                href={a.href}
                className="group flex min-h-12 items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <a.icon size={16} aria-hidden="true" className="shrink-0 text-on-surface-variant" />
                <span className="flex-1 text-body-md text-on-background group-hover:text-primary-container">{a.label}</span>
                <span className={`text-body-md tabular-nums ${a.alarm ? "text-error" : "text-on-background"}`}>{a.count}</span>
                <ArrowRight size={14} aria-hidden="true" className="shrink-0 text-on-surface-variant" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Label di kiri, angka di kanan: untuk dua sampai empat fakta pendek. */
export function FactRows({ rows }: { rows: { label: string; value: number | string; tone?: "alarm" }[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 border-t border-outline-variant/70 py-2 first:border-t-0 first:pt-0">
          <dt className="text-body-sm text-on-surface-variant">{row.label}</dt>
          <dd className={`text-body-sm tabular-nums ${row.tone === "alarm" ? "text-error" : "text-on-background"}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Bilah rasio dengan kedua ujungnya tertulis, isinya rasio sebenarnya. */
export function RatioMeter({ value, max, label, startLabel, endLabel }: {
  value: number;
  max: number;
  label: string;
  startLabel: string;
  endLabel: string;
}) {
  const ratio = max > 0 ? Math.min(value, max) / max : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        className="h-1.5 overflow-hidden rounded-full bg-surface-container-high"
      >
        <div className="h-full bg-gold-ink" style={{ width: `${ratio * 100}%` }} />
      </div>
      <div className="flex justify-between gap-3 text-body-sm tabular-nums text-on-surface-variant">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}

export type ListRow = {
  key: string;
  primary: string;
  secondary?: string | null;
  trailing?: string | null;
  tone?: "alarm" | "accent";
  /** Gambar asli baris itu (foto barang, sampul berita); `null` = objek ini belum punya gambar. */
  image?: string | null;
};

/** Gambar kecil sebuah objek. Tanpa gambar slotnya tetap ada (kosong), supaya teks sebaris rata. */
function Thumb({ src }: { src: string | null }) {
  return (
    <span aria-hidden="true" className={`relative h-10 w-10 shrink-0 overflow-hidden rounded ${src ? "" : "bg-surface-container-low"}`}>
      {src && <Image src={src} alt="" fill sizes="40px" className="object-cover" />}
    </span>
  );
}

/** Daftar pendek berisi nama di kiri dan satu keterangan di kanan, dengan gambar kecil bila ada. */
export function ShortList({ rows, empty }: { rows: ListRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-body-sm text-on-surface-variant">{empty}</p>;
  // Slot gambar hanya kalau setidaknya satu baris punya gambar asli.
  const withPictures = rows.some((row) => row.image);
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 border-t border-outline-variant/70 py-2 first:border-t-0 first:pt-0">
          {withPictures && <Thumb src={row.image ?? null} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm text-on-background">{row.primary}</span>
            {row.secondary && <span className="block truncate text-body-sm text-on-surface-variant">{row.secondary}</span>}
          </span>
          {row.trailing && (
            <span
              className={`shrink-0 self-start whitespace-nowrap text-body-sm tabular-nums ${
                row.tone === "alarm" ? "text-error" : row.tone === "accent" ? "text-gold-ink" : "text-on-surface-variant"
              }`}
            >
              {row.trailing}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Jumlah orang per divisi: angka di kanan, bilah tipis sebanding dengan divisi terbesar. */
export function DivisionBars({ rows, more }: { rows: { key: string; name: string; count: number }[]; more: number }) {
  if (rows.length === 0) return <p className="text-body-sm text-on-surface-variant">Belum ada divisi.</p>;
  const largest = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-body-sm text-on-background">{row.name}</span>
              <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{row.count}</span>
            </span>
            <span aria-hidden="true" className="block h-0.5 rounded-full bg-surface-container-high">
              <span className="block h-full rounded-full bg-on-surface-variant" style={{ width: `${(row.count / largest) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="text-body-sm text-on-surface-variant">dan {more} divisi lainnya</p>}
    </div>
  );
}

export type AgendaEvent = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  location: string | null;
  when: string;
  countdown: string | null;
  live: boolean;
  registered: number;
  capacity: number | null;
};

/** Baris acara: sampul, waktu, dan kuota. Tiap baris membuka acaranya. */
function EventRows({ events }: { events: AgendaEvent[] }) {
  return (
    <ul className="relative z-10 -mx-2 flex flex-col">
      {events.map((ev) => (
        <li key={ev.id}>
          <Link
            href={`/console/events/${ev.id}`}
            className="flex items-center gap-4 rounded-md px-2 py-2 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none"
          >
            <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-surface-container-high" aria-hidden="true">
              {ev.coverImageUrl ? (
                <Image src={ev.coverImageUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-headline-sm text-outline">
                  {ev.title.charAt(0)}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm text-on-background">{ev.title}</span>
              <span className="block text-body-sm text-on-surface-variant">
                {ev.when}
                {ev.countdown && <span className="text-gold-ink"> · {ev.countdown}</span>}
                <span className="tabular-nums sm:hidden">
                  {" · "}
                  {ev.registered}
                  {ev.capacity != null && ` / ${ev.capacity}`} terdaftar
                </span>
              </span>
            </span>
            <span className="hidden w-24 shrink-0 flex-col items-end gap-1.5 sm:flex">
              <span className="text-body-sm tabular-nums text-on-background">
                {ev.registered}
                <span className="text-on-surface-variant">{ev.capacity != null ? ` / ${ev.capacity}` : " terdaftar"}</span>
              </span>
              <EventCapacityMeter registered={ev.registered} capacity={ev.capacity} className="w-full" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Satu bagian berjudul di kartu Kegiatan; pemanggil tidak merendernya kalau kosong. */
function StageSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-body-sm font-semibold text-on-background">{title}</p>
      {children}
    </div>
  );
}

/**
 * Isi kartu Kegiatan: acara yang paling dekat (yang sedang berlangsung lebih dulu) tampil besar
 * dengan sampulnya, lalu sisanya dipisah per tahap. Bagian yang kosong tidak tampil.
 */
export function EventStage({ events, preparing, empty }: { events: AgendaEvent[]; preparing: ListRow[]; empty: string }) {
  const [lead, ...others] = [...events.filter((e) => e.live), ...events.filter((e) => !e.live)];
  const live = others.filter((e) => e.live);
  const upcoming = others.filter((e) => !e.live);
  const hasSide = live.length > 0 || upcoming.length > 0 || preparing.length > 0;
  const leadSpan = hasSide ? "xl:col-span-8" : "xl:col-span-12";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {lead ? (
        <Link
          href={`/console/events/${lead.id}`}
          className={`relative z-10 -m-2 grid min-w-0 gap-4 rounded-md p-2 transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none sm:grid-cols-2 ${leadSpan}`}
        >
          <span className="relative aspect-[16/10] overflow-hidden rounded bg-surface-container-high" aria-hidden="true">
            {lead.coverImageUrl ? (
              <Image src={lead.coverImageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-display-hero-mobile text-outline">
                {lead.title.charAt(0)}
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-col justify-center gap-2">
            <span className={`text-body-sm font-semibold ${lead.live ? "text-gold-ink" : "text-primary-container"}`}>
              {lead.live ? "Sedang berlangsung" : (lead.countdown ?? "Akan datang")}
            </span>
            <span className="text-headline-md text-on-background">{lead.title}</span>
            <span className="text-body-sm text-on-surface-variant">
              {lead.when}
              {lead.location && ` · ${lead.location}`}
            </span>
            <span className="mt-2 flex flex-col gap-1.5">
              <span className="text-body-sm tabular-nums text-on-background">
                {lead.registered}
                <span className="text-on-surface-variant">
                  {lead.capacity != null ? ` dari ${lead.capacity} kursi terisi` : " terdaftar"}
                </span>
              </span>
              <EventCapacityMeter registered={lead.registered} capacity={lead.capacity} />
            </span>
          </span>
        </Link>
      ) : (
        <p className={`text-body-sm text-on-surface-variant ${leadSpan}`}>{empty}</p>
      )}
      {hasSide && (
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          {live.length > 0 && (
            <StageSection title="Sedang berlangsung">
              <EventRows events={live} />
            </StageSection>
          )}
          {upcoming.length > 0 && (
            <StageSection title="Mendatang">
              <EventRows events={upcoming} />
            </StageSection>
          )}
          {preparing.length > 0 && (
            <StageSection title="Sedang disiapkan">
              <ShortList empty="" rows={preparing} />
            </StageSection>
          )}
        </div>
      )}
    </div>
  );
}

// Grid 6 kolom di layar lebar, 2 di tablet. Kartu Kegiatan (WIDE_CARD) memenuhi barisnya sendiri;
// kartu lain bertiga per baris, dan sisa pembagiannya berbagi rata berdua, supaya tidak ada sel
// kosong di ujung baris.
export const WIDE_CARD = "md:col-span-2 xl:col-span-6";

export function dashboardSpans(smallCount: number): string[] {
  const xl: string[] = Array.from({ length: smallCount }, () => "xl:col-span-2");
  // Sisa satu: empat kartu terakhir jadi dua baris berdua. Hanya kalau memang satu kartu,
  // kartu itu memakai lebar penuh.
  if (smallCount % 3 === 1 && smallCount >= 4) for (let i = smallCount - 4; i < smallCount; i++) xl[i] = "xl:col-span-3";
  else if (smallCount % 3 === 1) xl[smallCount - 1] = "xl:col-span-6";
  if (smallCount % 3 === 2) {
    xl[smallCount - 2] = "xl:col-span-3";
    xl[smallCount - 1] = "xl:col-span-3";
  }
  // Tablet: kartu berpasangan; yang ganjil terakhir melebar.
  return xl.map((cls, i) => (smallCount % 2 === 1 && i === smallCount - 1 ? `md:col-span-2 ${cls}` : cls));
}
