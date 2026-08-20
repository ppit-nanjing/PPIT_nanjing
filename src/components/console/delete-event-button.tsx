"use client";

import { deleteEvent } from "@/app/actions/admin-events";

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
    <form action={deleteEvent.bind(null, eventId)}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm("Yakin ingin menghapus kegiatan ini? Tindakan tidak bisa dibatalkan.")) {
            e.preventDefault();
          }
        }}
        className={
          className ??
          "text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
        }
      >
        {label}
      </button>
    </form>
  );
}
