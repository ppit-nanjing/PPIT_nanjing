"use client";

import { deleteMembershipApplication } from "@/app/actions/membership";

export function MembershipDeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteMembershipApplication}
      onSubmit={(e) => {
        if (!confirm("Hapus pendaftaran ini secara permanen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="bg-error-container text-on-error-container text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:opacity-90 transition-opacity"
      >
        Hapus Pendaftaran
      </button>
    </form>
  );
}
