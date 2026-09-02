"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Plus, TriangleAlert, X } from "lucide-react";
import { createItemReservation, releaseItemReservation } from "@/app/actions/admin-inventory";
import { Select } from "@/components/console/form";

type Opt = { id: string; name: string };
type Reservation = {
  id: string;
  itemName: string;
  reason: string;
  reservedFrom: string;
  reservedTo: string;
  eventTitle: string | null;
};

export function ReservationManager({
  items,
  events,
  reservations,
}: {
  items: Opt[];
  events: Opt[];
  reservations: Reservation[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal. Coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-body-md text-on-surface-variant">
        Blokir sebuah aset untuk periode acara PPIT. Selama periode itu aset tidak bisa diajukan peminjaman
        oleh siapa pun — pengajuan yang tanggalnya beririsan otomatis ditolak dengan pesan alasannya.
      </p>

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          <TriangleAlert size={16} aria-hidden /> {error}
        </p>
      )}

      <form
        action={(fd) => run(() => createItemReservation(fd))}
        className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4"
      >
        <p className="text-label-caps uppercase tracking-wide text-primary-container">
          <Plus size={14} className="inline -mt-0.5" /> Reservasi baru
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select name="itemId" defaultValue="" required aria-label="Barang" className="w-full">
            <option value="" disabled>
              Pilih barang *
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <Select name="eventId" defaultValue="" aria-label="Acara terkait" className="w-full">
            <option value="">Tautkan ke acara (opsional)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <input
          name="reason"
          required
          placeholder="Alasan / nama acara * — mis. WIF 2026"
          className="rounded-md bg-soft-gray p-2.5 text-body-md"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Dari tanggal *</span>
            <input name="reservedFrom" type="date" required className="rounded-md bg-soft-gray p-2.5 text-body-md" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Sampai tanggal *</span>
            <input name="reservedTo" type="date" required className="rounded-md bg-soft-gray p-2.5 text-body-md" />
          </label>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-primary-container px-4 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary disabled:opacity-50"
        >
          Simpan Reservasi
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {reservations.length === 0 ? (
          <li className="text-body-md text-on-surface-variant">Belum ada reservasi aktif.</li>
        ) : (
          reservations.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="min-w-0">
                <p className="text-body-md text-on-background">
                  <CalendarClock size={14} className="mr-1.5 -mt-0.5 inline text-primary-container" aria-hidden />
                  {r.itemName} — <span className="text-on-surface-variant">{r.reason}</span>
                </p>
                <p className="text-label-caps text-on-surface-variant">
                  {r.reservedFrom} – {r.reservedTo}
                  {r.eventTitle ? ` · acara: ${r.eventTitle}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => releaseItemReservation(r.id))}
                className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-label-caps uppercase tracking-wide text-error transition-colors hover:bg-error-container/30 disabled:opacity-50"
              >
                <X size={13} /> Lepas
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
