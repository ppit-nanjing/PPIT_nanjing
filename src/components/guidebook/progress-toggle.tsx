"use client";

import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";

/**
 * Kotak centang progres satu topik. Formulirnya dirakit di server component
 * (form action = Server Action), jadi tombol ini cuma menyediakan tampilan
 * "sedang disimpan" - tanpa JavaScript pun tetap tersimpan setelah reload.
 *
 * useFormStatus harus dipanggil dari komponen di dalam <form>, bukan dari
 * komponen yang merender form-nya.
 */
export function ProgressToggleButton({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-pressed={checked}
      aria-label={label}
      title={label}
      disabled={pending}
      className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked
          ? "bg-primary border-primary text-on-primary"
          : "bg-surface-container-lowest border-outline-variant text-transparent hover:border-primary-container"
      } ${pending ? "opacity-50" : ""}`}
    >
      <Check size={14} strokeWidth={3} aria-hidden="true" />
    </button>
  );
}
