"use client";

import { useRef } from "react";

// "Tolak…" untuk formulir tinjauan (sumbangan, usulan pengadaan) yang memakai <form action> dengan tombol
// `decision`. Menolak butuh alasan yang ikut terkirim ke pengusul lewat notifikasi, sama seperti
// penolakan peminjaman. Di dalam <details> supaya tidak butuh state per baris; kolom alasan tidak diberi
// `required` (kolom di <details> tertutup memblokir tombol Setujui secara diam-diam), jadi validasinya
// dilakukan di tombol tolak.
export function RejectWithReason({ disabled }: { disabled?: boolean }) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <details
      className="w-full rounded-md border border-outline-variant"
      onToggle={(e) => {
        if (e.currentTarget.open) taRef.current?.focus();
      }}
    >
      <summary className="cursor-pointer list-none px-5 py-2.5 text-label-caps uppercase tracking-wide text-secondary transition-colors hover:text-on-background">
        Tolak…
      </summary>
      <div className="flex flex-col gap-2 border-t border-outline-variant p-3">
        <label className="flex flex-col gap-1">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Alasan penolakan</span>
          <textarea
            ref={taRef}
            name="reason"
            rows={2}
            maxLength={300}
            placeholder="mis. Barang serupa sudah cukup di gudang"
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            className="w-full rounded-md bg-soft-gray p-2.5 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
        </label>
        <p className="text-body-sm text-on-surface-variant">Alasan ini dikirim ke pengusul lewat notifikasi.</p>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={disabled}
          onClick={(e) => {
            const ta = taRef.current;
            if (ta && ta.value.trim().length < 3) {
              e.preventDefault();
              ta.setCustomValidity("Tulis alasan penolakan supaya pengusul tahu kenapa.");
              ta.reportValidity();
            }
          }}
          className="self-start rounded-md bg-error-container px-4 py-2 text-label-caps uppercase tracking-wide text-on-error-container transition-opacity hover:opacity-80 disabled:opacity-60 motion-reduce:transition-none"
        >
          Tolak pengajuan
        </button>
      </div>
    </details>
  );
}
