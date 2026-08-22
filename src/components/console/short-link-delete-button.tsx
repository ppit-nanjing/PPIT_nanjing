"use client";

import { useState } from "react";

export function ShortLinkDeleteButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="bg-error-container/40 text-on-error-container text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-error-container/60 transition-colors"
      >
        Hapus
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <button
        type="submit"
        className="bg-error-container text-on-error-container text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg transition-colors"
      >
        Ya, hapus
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="bg-surface-container-low border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-lg transition-colors"
      >
        Batal
      </button>
    </form>
  );
}
