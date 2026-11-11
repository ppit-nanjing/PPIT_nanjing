import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronRight, ExternalLink, Plus } from "lucide-react";
import { ConfirmButton } from "@/components/console/confirm-button";
import { SubmitButton } from "@/components/console/submit-button";
import { primaryBtn } from "@/components/console/form";
import { KatalogNav } from "./katalog-nav";

// Tujuh bagian katalog. Urutannya mengikuti dua hal yang diisi halaman ini: info kota
// (tempat, kampus, distrik, wilayah naungan) lalu etalase organisasi.
export const KATALOG_TABS = [
  { key: "tempat", label: "Tempat", group: "kota" },
  { key: "kampus", label: "Kampus", group: "kota" },
  { key: "distrik", label: "Distrik", group: "kota" },
  { key: "wilayah", label: "Wilayah Naungan", group: "kota" },
  { key: "merchandise", label: "Merchandise", group: "katalog" },
  { key: "sponsor", label: "Sponsor", group: "katalog" },
  { key: "donasi", label: "Donasi", group: "katalog" },
] as const;

export type KatalogTab = (typeof KATALOG_TABS)[number]["key"];

export function KatalogTabs({
  active,
  counts,
  pendingDonations,
}: {
  active: KatalogTab;
  /** Tab yang tidak ada di sini tidak ditampilkan (Donasi hanya untuk pemegang modul Organisasi). */
  counts: Partial<Record<KatalogTab, number>>;
  pendingDonations: number;
}) {
  const tabs = KATALOG_TABS.filter((tab) => counts[tab.key] !== undefined);
  return (
    <KatalogNav
      tabs={tabs.map((tab, i) => {
        const waiting = tab.key === "donasi" && pendingDonations > 0;
        return {
          key: tab.key,
          label: tab.label,
          count: waiting ? `${pendingDonations} menunggu` : String(counts[tab.key]),
          attention: waiting,
          current: tab.key === active,
          dividerBefore: i > 0 && tabs[i - 1].group !== tab.group,
        };
      })}
    />
  );
}

/** Satu kalimat tentang di mana isi tab ini tampil, dengan jalan pintas ke halaman publiknya. */
export function TabIntro({ children, href, hrefLabel }: { children: ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <p className="max-w-2xl text-body-md text-on-surface-variant">{children}</p>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-body-sm text-primary-container underline-offset-4 hover:underline"
        >
          {hrefLabel} <ExternalLink size={13} aria-hidden />
        </a>
      )}
    </div>
  );
}

/** Tombol "Tambah ..." yang membuka form di tempat. Tanpa JavaScript: <details> biasa. */
export function AddPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className={`${primaryBtn} inline-flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden`}>
        <Plus size={15} aria-hidden className="transition-transform group-open:rotate-45 motion-reduce:transition-none" />
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">Batal</span>
      </summary>
      <div className="mt-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">{children}</div>
    </details>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span aria-hidden className={`relative h-11 w-11 shrink-0 overflow-hidden rounded ${src ? "" : "bg-surface-container-low"}`}>
      {src && <Image src={src} alt="" fill sizes="44px" className="object-cover" />}
    </span>
  );
}

/**
 * Satu entri katalog. Barisnya ringkasan; diklik, form editnya terbuka di bawahnya.
 * `image` tidak dikirim (undefined) = daftar ini memang tanpa gambar, jadi slotnya tidak dibuat.
 */
export function EntryRow({
  image,
  title,
  aside,
  meta,
  badge,
  children,
}: {
  image?: string | null;
  title: string;
  aside?: string | null;
  meta?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low/60 motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
        {image !== undefined && <Thumb src={image} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-md text-on-background">
            {title}
            {aside && <span className="ml-2 text-on-surface-variant">{aside}</span>}
          </span>
          {meta && <span className="block truncate text-body-sm text-on-surface-variant">{meta}</span>}
        </span>
        {badge}
        <span className="hidden shrink-0 text-label-caps uppercase tracking-wide text-primary-container sm:inline">
          <span className="group-open:hidden">Edit</span>
          <span className="hidden group-open:inline">Tutup</span>
        </span>
        <ChevronRight
          size={18}
          aria-hidden
          className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-t border-outline-variant/70 bg-surface-container-low/40 px-4 py-5">{children}</div>
    </details>
  );
}

/** Penanda kecil di baris, mis. "Disembunyikan". */
export function RowBadge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "attention" | "ok" }) {
  const color = tone === "attention" ? "text-gold-ink" : tone === "ok" ? "text-primary-container" : "text-on-surface-variant";
  return <span className={`shrink-0 text-label-caps uppercase tracking-wide ${color}`}>{children}</span>;
}

/** Ekor form: Simpan di kiri, Hapus (dengan konfirmasi) di kanan bila entrinya sudah ada. */
export function FormFooter({
  submitLabel,
  successMessage,
  remove,
}: {
  submitLabel: string;
  successMessage: string;
  remove?: { action: (formData: FormData) => void | Promise<void>; id: string; itemLabel: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <SubmitButton successMessage={successMessage} pendingLabel="Menyimpan…" className={primaryBtn}>
        {submitLabel}
      </SubmitButton>
      {remove && (
        <ConfirmButton
          title="Hapus entri ini?"
          message={`"${remove.itemLabel}" akan dihapus permanen dari katalog.`}
          action={remove.action}
          payload={{ id: remove.id }}
          className="rounded-md px-3 py-2 text-label-caps uppercase tracking-wide text-error transition-colors hover:bg-error-container/30"
        >
          Hapus
        </ConfirmButton>
      )}
    </div>
  );
}

/** Kolom terjemahan Inggris: jarang disentuh, jadi dilipat. Kosong = diterjemahkan otomatis. */
export function EnglishFields({ children }: { children: ReactNode }) {
  return (
    <details className="rounded-md border border-outline-variant/70">
      <summary className="cursor-pointer px-3 py-2 text-body-sm text-on-surface-variant">
        Terjemahan Inggris (kosongkan untuk diterjemahkan otomatis)
      </summary>
      <div className="flex flex-col gap-4 px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}
