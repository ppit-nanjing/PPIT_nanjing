"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

// Baris judul halaman Kegiatan. Form buat acara dibuka di bawah judul, bukan modal,
// dan hanya disembunyikan saat ditutup supaya isian yang belum dikirim tidak hilang.
export function EventsPageHeader({
  title,
  subline,
  guide,
  children,
}: {
  title: string;
  subline?: string;
  guide?: ReactNode;
  /** Form buat acara. Kosong = akun ini tidak boleh membuat acara. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">{title}</h1>
          {subline && <p className="mt-1 max-w-[62ch] text-body-md text-on-surface-variant">{subline}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {guide}
          {children && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls="event-create-panel"
              onClick={() => {
                setMounted(true);
                setOpen((value) => !value);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-primary-container px-4 py-2.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary"
            >
              {open ? <X size={15} aria-hidden /> : <Plus size={15} aria-hidden />}
              {open ? "Tutup Form" : "Buat Kegiatan"}
            </button>
          )}
        </div>
      </div>
      {mounted && (
        <section
          id="event-create-panel"
          aria-label="Buat kegiatan baru"
          hidden={!open}
          className="mt-4 rounded-xl border border-outline-variant bg-surface-container-lowest pt-4"
        >
          {children}
        </section>
      )}
    </div>
  );
}
