"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = true,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Isi baru dipasang saat bagian pertama kali dibuka (halaman kegiatan punya belasan
  // bagian tertutup dengan editor berat), tetapi setelah itu hanya disembunyikan, bukan
  // dibuang: melipat bagian tidak boleh menghapus isian yang belum disimpan.
  const [mounted, setMounted] = useState(defaultOpen);
  const uid = useId();
  const headingId = `${uid}-heading`;
  const panelId = `${uid}-panel`;

  return (
    <section
      aria-labelledby={headingId}
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden ${className}`}
    >
      {/* Judul bagian = heading (pembaca layar bisa melompat antar-heading) dengan tombol di
          dalamnya: pola accordion standar. Sengaja role="heading", bukan <h2>: aturan global
          h1-h3 di globals.css memaksa Cinzel, yang akan ikut mengubah deskripsi di bawah judul. */}
      <div role="heading" aria-level={2} id={headingId}>
        <button
          type="button"
          onClick={() => {
            setMounted(true);
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 text-left hover:bg-surface-container-low/60 transition-colors"
        >
          <span className="flex flex-col">
            <span className="text-headline-sm text-on-background">{title}</span>
            {description ? (
              <span className="text-body-sm text-on-surface-variant mt-0.5">{description}</span>
            ) : null}
          </span>
          {open ? (
            <ChevronDown size={20} aria-hidden className="text-on-surface-variant shrink-0" />
          ) : (
            <ChevronRight size={20} aria-hidden className="text-on-surface-variant shrink-0" />
          )}
        </button>
      </div>
      {mounted ? (
        <div id={panelId} hidden={!open} className="px-4 pb-5 sm:px-6 sm:pb-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
