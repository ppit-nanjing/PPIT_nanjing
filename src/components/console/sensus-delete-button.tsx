"use client";

import { deleteSensusProfile } from "@/app/actions/sensus";
import { ConfirmButton } from "@/components/console/confirm-button";

export function SensusDeleteButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      onConfirm={() => deleteSensusProfile(id)}
      title="Hapus baris sensus?"
      message="Data sensus orang ini akan dihapus permanen. Akun mereka tidak dihapus — mereka bisa mengisi ulang lewat /sensus. Tercatat di log perubahan."
      className="bg-error-container text-on-error-container text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:opacity-90 transition-opacity"
    >
      Hapus Sensus
    </ConfirmButton>
  );
}
