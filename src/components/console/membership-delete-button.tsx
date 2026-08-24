"use client";

import { deleteMembershipApplication } from "@/app/actions/membership";
import { ConfirmButton } from "@/components/console/confirm-button";

export function MembershipDeleteButton({ id }: { id: string }) {
  return (
    <ConfirmButton
      onConfirm={() => deleteMembershipApplication(id)}
      title="Hapus pendaftaran?"
      message="Pendaftaran ini akan dihapus secara permanen."
      className="bg-error-container text-on-error-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:opacity-90 transition-opacity"
    >
      Hapus Pendaftaran
    </ConfirmButton>
  );
}
