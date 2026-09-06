"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

// Daftar rekaman yang bisa dibuka-tutup per baris — dipakai untuk semua panel
// console yang isinya deret orang/pengajuan dengan detail panjang (Daftar
// Pendaftar, Verifikasi Pembayaran, Pengajuan Peminjaman, Usulan Pengadaan,
// Pendaftar Volunteer, dst). Tertutup: cukup identitas + badge status;
// klik buka: seluruh detail + form aksinya.

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-surface-container-low text-on-surface-variant",
  // "info" = butuh perhatian (mis. Menunggu Verifikasi / Menunggu keputusan)
  info: "bg-primary-container/15 text-primary-container",
  success: "bg-primary-container/10 text-primary-container",
  warning: "bg-tertiary-container/40 text-on-tertiary-container",
  danger: "bg-error-container/50 text-on-error-container",
};

export type RecordSummary = {
  title: ReactNode;
  /** Baris kecil di bawah judul, hanya tampil saat baris tertutup. */
  subtitle?: ReactNode;
  badge?: { text: string; tone?: BadgeTone };
};

export function CollapsibleRecordList<T extends { id: string }>({
  records,
  countLabel,
  emptyText,
  defaultOpen,
  banner,
  renderSummary,
  renderDetail,
}: {
  records: T[];
  /** mis. (n) => `${n} pendaftar` */
  countLabel?: (n: number) => string;
  emptyText: string;
  /** baris yang cocok kebuka otomatis (mis. yang masih perlu ditindak) */
  defaultOpen?: (r: T) => boolean;
  /** konten di atas bar hitung/toggle (mis. checklist panduan verifikasi) */
  banner?: ReactNode;
  renderSummary: (r: T) => RecordSummary;
  renderDetail: (r: T) => ReactNode;
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(defaultOpen ? records.filter(defaultOpen).map((r) => r.id) : []),
  );

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = records.length > 0 && records.every((r) => open.has(r.id));

  if (records.length === 0) {
    return <p className="py-2 text-body-md text-on-surface-variant">{emptyText}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {banner}
      <div className="flex items-center justify-between">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {countLabel ? countLabel(records.length) : records.length}
        </p>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(records.map((r) => r.id)))}
          className="text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary motion-reduce:transition-none"
        >
          {allOpen ? "Tutup semua" : "Buka semua"}
        </button>
      </div>

      <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {records.map((r) => {
          const isOpen = open.has(r.id);
          const s = renderSummary(r);
          return (
            <li key={r.id} className="border-b border-outline-variant/60 last:border-0">
              <button
                type="button"
                onClick={() => toggle(r.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-surface-container-low/60 motion-reduce:transition-none sm:gap-3 sm:px-4"
              >
                <ChevronRight
                  size={16}
                  aria-hidden
                  className={`mt-0.5 shrink-0 text-on-surface-variant transition-transform motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
                />
                {/* Judul + badge sebaris di layar lebar; di layar sempit badge
                    turun ke bawah judul (judul jaga lebar minimal, tak sampai
                    tergencet jadi "Hil…"). Subtitle selalu baris sendiri. */}
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-[7rem] flex-1 truncate font-medium text-on-background">{s.title}</span>
                  {s.badge && (
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-label-caps uppercase tracking-wide ${TONE_CLASS[s.badge.tone ?? "neutral"]}`}
                    >
                      {s.badge.text}
                    </span>
                  )}
                  {!isOpen && s.subtitle != null && s.subtitle !== "" && (
                    <span className="w-full truncate text-label-caps text-on-surface-variant">{s.subtitle}</span>
                  )}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-3 px-3 pb-4 pl-9 sm:px-4 sm:pl-11">{renderDetail(r)}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
