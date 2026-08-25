"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

type Props = {
  /** Client-side callback - use this from other CLIENT components. */
  onConfirm?: () => void | Promise<void>;
  /**
   * Server action invoked with a FormData built from `payload` - the form to
   * use from SERVER components: plain closures can't cross the RSC boundary
   * (React #375/#441), but a "use server" action reference is serializable.
   */
  action?: (formData: FormData) => void | Promise<void>;
  payload?: Record<string, string>;
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Trigger element content, e.g. an icon or "Hapus" text. */
  children: ReactNode;
  /** className applied to the trigger <button>. */
  className?: string;
  "aria-label"?: string;
  /** Set false for a non-destructive confirmation (confirm button uses primary styling instead of error). */
  danger?: boolean;
};

// Next.js's redirect()/notFound() signal control flow by throwing a special
// value with a NEXT_*-prefixed digest, not a real failure - onConfirm()
// callbacks that call a server action ending in redirect() (deleteEvent,
// deleteMembershipApplication) rely on this propagating past us undisturbed
// instead of being caught and shown as an error message.
function isNextControlFlowSignal(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_")
  );
}

// In-app replacement for window.confirm() before a destructive action -
// browser-native confirm() can't be styled, gets suppressed by some browser
// settings, and blocks the whole tab's JS thread while open. Every delete
// button in the console should go through this instead.
export function ConfirmButton({
  onConfirm,
  action,
  payload,
  message,
  title = "Konfirmasi",
  confirmLabel = "Ya, hapus",
  cancelLabel = "Batal",
  children,
  className,
  danger = true,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  function run() {
    startTransition(async () => {
      setError(null);
      try {
        if (action) {
          const fd = new FormData();
          for (const [key, value] of Object.entries(payload ?? {})) fd.set(key, value);
          await action(fd);
        } else if (onConfirm) {
          await onConfirm();
        }
        close();
      } catch (err) {
        if (isNextControlFlowSignal(err)) throw err;
        setError(err instanceof Error ? err.message : "Gagal melakukan tindakan ini.");
      }
    });
  }

  // Default focus lands on Cancel (the safe action), matching native
  // confirm()'s convention of not defaulting to the destructive choice.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={className} aria-label={rest["aria-label"]}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => (pending ? null : close())}
          onKeyDown={(e) => {
            if (pending) return;
            if (e.key === "Escape") {
              close();
            } else if (e.key === "Tab") {
              // Minimal focus trap: only Cancel/Confirm live in this dialog,
              // so Tab (either direction) just toggles between the two
              // instead of letting focus escape to the page behind it.
              e.preventDefault();
              (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 px-5 py-4">
              <TriangleAlert size={20} className="text-error shrink-0 mt-0.5" aria-hidden />
              <div>
                <h2 className="text-headline-sm text-on-background">{title}</h2>
                <p className="text-body-md text-on-surface-variant mt-1">{message}</p>
                {error && (
                  <p className="text-body-sm text-on-error-container bg-error-container/40 rounded-lg px-3 py-2 mt-3">{error}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-outline-variant">
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                onClick={close}
                className="text-label-caps uppercase tracking-wide px-4 py-2 rounded-md border border-outline-variant text-on-background hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                disabled={pending}
                onClick={run}
                className={`text-label-caps uppercase tracking-wide px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
                  danger
                    ? "bg-error-container text-on-error-container hover:opacity-90"
                    : "bg-primary-container text-on-primary hover:bg-primary"
                }`}
              >
                {pending ? "…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
