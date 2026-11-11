import Image from "next/image";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EventCapacityMeter } from "@/components/console/event-capacity-meter";
import { EventStatusMark, type EventStatusTone } from "@/components/console/event-status-mark";

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

export type StageEvent = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  /** Plat tanggal untuk acara tanpa sampul; null kalau tanggalnya belum diisi. */
  plate: { day: string; month: string } | null;
  when: string;
  location: string | null;
  /** "3 hari lagi", "Sedang berlangsung", atau langkah berikutnya untuk acara yang disiapkan. */
  status: string | null;
  /** Kuota hanya untuk acara yang sudah tayang. */
  seats: { registered: number; capacity: number | null } | null;
};

export type StageGroup = { events: StageEvent[]; total: number };

type StageKind = "live" | "upcoming" | "preparing";

const STAGE_LABEL: Record<StageKind, string> = {
  live: "Sedang berlangsung",
  upcoming: "Mendatang",
  preparing: "Sedang disiapkan",
};

const STAGE_TONE: Record<StageKind, EventStatusTone> = { live: "gold", upcoming: "jade", preparing: "neutral" };

const STATUS_TEXT: Record<StageKind, string> = {
  live: "text-gold-ink",
  upcoming: "text-primary-container",
  preparing: "text-on-surface-variant",
};

/**
 * Sampul acara. Acara tanpa sampul mendapat plat hijau giok berisi tanggalnya, atau lambang
 * PPIT kalau tanggalnya pun belum diisi.
 */
function EventCover({ ev, size }: { ev: StageEvent; size: "large" | "small" }) {
  if (ev.coverImageUrl) {
    return <Image src={ev.coverImageUrl} alt="" fill sizes={size === "large" ? "(max-width: 640px) 100vw, 360px" : "64px"} className="object-cover" />;
  }
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center bg-band text-on-band">
      {ev.plate ? (
        <>
          <span className={`${size === "large" ? "text-display-hero-mobile" : "text-headline-sm"} leading-none text-band-accent`}>
            {ev.plate.day}
          </span>
          <span className={`${size === "large" ? "mt-1 text-body-md" : "text-body-sm leading-tight"} text-on-band-muted`}>
            {ev.plate.month}
          </span>
        </>
      ) : (
        <span className={`brand-logo text-band-accent ${size === "large" ? "h-16" : "h-7"}`} />
      )}
    </span>
  );
}

function Seats({ seats }: { seats: NonNullable<StageEvent["seats"]> }) {
  return (
    <span className="text-body-sm tabular-nums text-on-background">
      {seats.registered}
      <span className="text-on-surface-variant">{seats.capacity != null ? ` / ${seats.capacity} kursi` : " terdaftar"}</span>
    </span>
  );
}

const ITEM_LINK =
  "relative z-10 rounded-md transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none";

/** Acara pertama di sebuah kolom: sampulnya di atas, atau di samping kalau kolomnya lebar. */
function FeaturedEvent({ ev, kind }: { ev: StageEvent; kind: StageKind }) {
  return (
    <Link
      href={`/console/events/${ev.id}`}
      className={`${ITEM_LINK} -m-2 grid gap-3 p-2 @xl:grid-cols-[minmax(0,15rem)_1fr] @xl:items-center @xl:gap-5 @4xl:grid-cols-[minmax(0,20rem)_1fr]`}
    >
      <span className="relative aspect-[16/9] overflow-hidden rounded bg-surface-container-high" aria-hidden="true">
        <EventCover ev={ev} size="large" />
      </span>
      <span className="flex min-w-0 max-w-2xl flex-col gap-1.5">
        {ev.status && <span className={`text-body-sm font-semibold ${STATUS_TEXT[kind]}`}>{ev.status}</span>}
        <span className="line-clamp-2 text-headline-sm text-on-background">{ev.title}</span>
        <span className="line-clamp-2 text-body-sm text-on-surface-variant">
          {ev.when}
          {ev.location && ` · ${ev.location}`}
        </span>
        {ev.seats && (
          <span className="mt-1 flex flex-col gap-1.5">
            <Seats seats={ev.seats} />
            <EventCapacityMeter registered={ev.seats.registered} capacity={ev.seats.capacity} />
          </span>
        )}
      </span>
    </Link>
  );
}

/** Acara berikutnya di kolom yang sama, sebagai baris ringkas. */
function EventRow({ ev, kind }: { ev: StageEvent; kind: StageKind }) {
  return (
    <li className="border-t border-outline-variant/70 pt-2">
      <Link href={`/console/events/${ev.id}`} className={`${ITEM_LINK} -mx-2 flex items-center gap-3 px-2 py-1.5`}>
        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded bg-surface-container-high" aria-hidden="true">
          <EventCover ev={ev} size="small" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm text-on-background">{ev.title}</span>
          <span className="block truncate text-body-sm text-on-surface-variant">
            {kind === "preparing" ? ev.status : ev.when}
          </span>
        </span>
        {ev.seats && (
          <span className="shrink-0">
            <Seats seats={ev.seats} />
          </span>
        )}
      </Link>
    </li>
  );
}

function StageColumn({ kind, group }: { kind: StageKind; group: StageGroup }) {
  const [first, ...rest] = group.events;
  const hidden = group.total - group.events.length;
  return (
    <section aria-label={STAGE_LABEL[kind]} className="@container flex min-w-0 flex-col gap-4 py-5 first:pt-0 last:pb-0 xl:px-6 xl:py-0 xl:first:pl-0 xl:last:pr-0">
      <div className="flex items-baseline justify-between gap-3">
        <EventStatusMark label={STAGE_LABEL[kind]} tone={STAGE_TONE[kind]} bare />
        <span className="text-body-sm tabular-nums text-on-surface-variant">{group.total}</span>
      </div>
      <FeaturedEvent ev={first} kind={kind} />
      {rest.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rest.map((ev) => (
            <EventRow key={ev.id} ev={ev} kind={kind} />
          ))}
        </ul>
      )}
      {hidden > 0 && <p className="text-body-sm text-on-surface-variant">dan {hidden} acara lainnya</p>}
    </section>
  );
}

const STAGE_COLUMNS: Record<number, string> = { 1: "xl:grid-cols-1", 2: "xl:grid-cols-2", 3: "xl:grid-cols-3" };

/**
 * Isi kartu Kegiatan: satu kolom per tahap yang ada isinya (sedang berlangsung, mendatang,
 * sedang disiapkan), sama lebar dan dipisah garis. Acara pertama tiap kolom tampil besar.
 */
export function EventStage({
  live,
  upcoming,
  preparing,
  empty,
}: {
  live: StageGroup;
  upcoming: StageGroup;
  preparing: StageGroup;
  empty: string;
}) {
  const columns = (
    [
      ["live", live],
      ["upcoming", upcoming],
      ["preparing", preparing],
    ] as const
  ).filter(([, group]) => group.events.length > 0);
  if (columns.length === 0) return <p className="text-body-sm text-on-surface-variant">{empty}</p>;
  return (
    <div className={`grid grid-cols-1 divide-y divide-outline-variant xl:divide-x xl:divide-y-0 ${STAGE_COLUMNS[columns.length]}`}>
      {columns.map(([kind, group]) => (
        <StageColumn key={kind} kind={kind} group={group} />
      ))}
    </div>
  );
}

/**
 * Pita tipis di dasar dashboard: jalan ke Dokumentasi, dengan artikel yang terakhir diperbarui.
 * Seluruh pita membuka Dokumentasi; tiap judul artikel membuka artikelnya sendiri.
 */
export function DocsStrip({ total, recent }: { total: number; recent: { slug: string; title: string }[] }) {
  return (
    <section
      aria-labelledby="pita-dokumentasi"
      className={`group relative flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-4 transition-colors hover:border-muted-gold focus-within:border-muted-gold motion-reduce:transition-none lg:flex-row lg:items-center lg:gap-8 ${WIDE_CARD}`}
    >
      <div className="flex shrink-0 items-baseline gap-3">
        <h2 id="pita-dokumentasi" className="text-headline-sm text-on-background">
          <Link
            href="/console/docs"
            className="rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
          >
            Dokumentasi
          </Link>
        </h2>
        <span className="text-body-sm tabular-nums text-on-surface-variant">{total} panduan</span>
      </div>
      {recent.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-row lg:items-baseline lg:gap-4">
          <span className="shrink-0 text-body-sm text-on-surface-variant">Baru diperbarui</span>
          <ul className="flex min-w-0 flex-wrap gap-x-5 gap-y-1">
            {recent.map((a) => (
              <li key={a.slug} className="min-w-0">
                <Link
                  href={`/console/docs/${a.slug}`}
                  className="relative z-10 block truncate rounded-sm text-body-sm text-on-background underline-offset-4 transition-colors hover:text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p aria-hidden="true" className="flex shrink-0 items-center gap-1.5 text-body-sm text-primary-container">
        Buka Dokumentasi
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
      </p>
    </section>
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
