"use client";

import { deleteNewsArticle } from "@/app/actions/admin-content";
import { ConfirmButton } from "@/components/console/confirm-button";

export function DeleteNewsButton({
  id,
  label = "Hapus",
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <ConfirmButton
      onConfirm={() => deleteNewsArticle(id)}
      title="Hapus berita?"
      message="Tindakan ini tidak bisa dibatalkan. Untuk menyimpan arsipnya, pakai Arsipkan."
      className={
        className ??
        "text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
      }
    >
      {label}
    </ConfirmButton>
  );
}
