"use client";

import { deleteEvent } from "@/app/actions/admin-events";
import { ConfirmButton } from "@/components/console/confirm-button";

// "Hapus" = pindah ke Sampah (bisa dipulihkan). Hapus permanen hanya dari
// bagian Sampah di /console/events.
export function DeleteEventButton({
  eventId,
  label = "Hapus",
  className,
}: {
  eventId: string;
  label?: string;
  className?: string;
}) {
  return (
    <ConfirmButton
      onConfirm={() => deleteEvent(eventId)}
      title="Pindahkan ke Sampah?"
      message="Kegiatan langsung hilang dari situs publik dan dari akses panitia. Semua datanya (pendaftar, panitia, evaluasi) tetap tersimpan dan bisa dipulihkan dari bagian Sampah di halaman Kegiatan."
      confirmLabel="Ya, pindahkan"
      successMessage="Dipindah ke Sampah."
      className={
        className ??
        "text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
      }
    >
      {label}
    </ConfirmButton>
  );
}
