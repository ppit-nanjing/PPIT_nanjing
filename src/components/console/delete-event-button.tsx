"use client";

import { deleteEvent } from "@/app/actions/admin-events";
import { ConfirmButton } from "@/components/console/confirm-button";

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
      title="Hapus kegiatan?"
      message="Tindakan ini tidak bisa dibatalkan."
      className={
        className ??
        "text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
      }
    >
      {label}
    </ConfirmButton>
  );
}
