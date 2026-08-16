"use client";

import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AuthFormState } from "@/app/actions/auth";

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "signin" | "signup";
  returnTo?: string;
};

export function CredentialForm({ action, mode, returnTo }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthFormState);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorId = "credential-error";
  const passwordHintId = "password-hint";
  const invalid = Boolean(state?.error);

  useEffect(() => {
    if (invalid) emailRef.current?.focus();
  }, [invalid]);

  const fieldClass =
    "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Email <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          ref={emailRef}
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="nama@mail.com"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          Kata Sandi <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : mode === "signup" ? passwordHintId : undefined}
          className={fieldClass}
        />
        {mode === "signup" && (
          <span id={passwordHintId} className="text-label-caps text-on-surface-variant">
            Minimal 8 karakter.
          </span>
        )}
      </div>

      {mode === "signup" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            Konfirmasi Kata Sandi <span className="text-error" aria-hidden="true">*</span>
          </label>
          <input
            id="confirm"
            type="password"
            name="confirm"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={fieldClass}
          />
        </div>
      )}

      {state?.error && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 bg-error-container/40 border-l-4 border-error rounded-r-lg p-3"
        >
          <AlertCircle className="text-error shrink-0 mt-0.5" size={16} />
          <p className="text-body-sm text-on-background">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        {mode === "signup" ? "Daftar" : "Masuk"}
      </button>

      {mode === "signin" ? (
        <p className="text-body-sm text-on-surface-variant text-center">
          Belum punya akun?{" "}
          <Link
            href="/signup"
            className="text-primary-container font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            Daftar di sini
          </Link>
        </p>
      ) : (
        <p className="text-body-sm text-on-surface-variant text-center">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="text-primary-container font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            Masuk di sini
          </Link>
        </p>
      )}
    </form>
  );
}
