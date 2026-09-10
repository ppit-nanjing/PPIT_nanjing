"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

type Props = {
  children: ReactNode;
  className?: string;
  /** Shown while the action is in flight. Defaults to children (no separate pending copy needed). */
  pendingLabel?: ReactNode;
  /** Toast fired once the action finishes without throwing. Pass "" to suppress. */
  successMessage?: string;
  disabled?: boolean;
};

// Drop-in replacement for a plain `<button type="submit">` inside a
// `<form action={serverAction}>` - must be rendered INSIDE that form so
// useFormStatus() picks up its pending state (React requirement, it doesn't
// work on the form element itself).
//
// Fires `successMessage` when pending flips true -> false, i.e. the action
// returned normally. If the action THROWS, Next unmounts this subtree to the
// nearest error boundary before that transition completes, so no false
// "success" toast fires - this only works for actions that throw on failure
// (AGENTS.md's default), not ones that return inline `{error}` form state.
// For those (useActionState / useFormState forms), toast from the returned
// state instead of using this component.
export function SubmitButton({ children, className, pendingLabel, successMessage = "Tersimpan.", disabled }: Props) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && successMessage) toast.success(successMessage);
    wasPending.current = pending;
  }, [pending, successMessage]);

  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

// Counterpart for forms built on useActionState (inline `{error?: string}`
// form state, e.g. EventFormState/ShortLinkFormState/ContentFormState) -
// SubmitButton can't tell success from a returned validation error there,
// since the action never throws. Call with the hook's own `isPending` (its
// 3rd return value) right in the form component; fires a toast once a
// pending run finishes, error or success. A run that ends in redirect()
// unmounts the component first, so it silently fires neither - fine, the
// navigation itself is the success signal there.
export function useActionToast(isPending: boolean, error: string | null | undefined, successMessage = "Tersimpan.") {
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending) {
      if (error) toast.error(error);
      else if (successMessage) toast.success(successMessage);
    }
    wasPending.current = isPending;
  }, [isPending, error, successMessage]);
}
