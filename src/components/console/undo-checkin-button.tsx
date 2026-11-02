"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { undoCheckIn } from "@/app/actions/admin-events";

const UNDO_ERROR = {
  forbidden: "Kamu tidak punya izin membatalkan check-in ini.",
  notfound: "Check-in ini sudah tidak tercatat.",
  expired: "Sudah lewat 10 menit. Minta BPH panitia yang membatalkan.",
} as const;

// Tombol "Batalkan check-in" untuk salah ketuk / salah scan di pintu. Aksinya
// sendiri dibatasi di server (lihat undoCheckIn): petugas hanya check-in buatannya
// sendiri dalam 10 menit, BPH panitia kapan pun.
export function UndoCheckInButton({
  eventId,
  kind,
  userId,
  onUndone,
}: {
  eventId: string;
  kind: "participant" | "committee";
  userId: string;
  onUndone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function undo() {
    setError(null);
    startTransition(async () => {
      const res = await undoCheckIn(eventId, kind, userId);
      if (res.ok) onUndone();
      else setError(UNDO_ERROR[res.reason]);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={undo}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-3 py-2 text-label-caps uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background disabled:opacity-50"
      >
        <Undo2 size={14} aria-hidden="true" /> {pending ? "Membatalkan..." : "Batalkan check-in"}
      </button>
      {error && (
        <span role="alert" className="text-body-sm text-error">
          {error}
        </span>
      )}
    </span>
  );
}
