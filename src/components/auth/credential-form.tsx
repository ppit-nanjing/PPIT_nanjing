"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { AuthFormState } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/client";

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  googleAction?: (formData: FormData) => Promise<void>;
  mode: "signin" | "signup";
  returnTo?: string;
};

// Input dengan ikon leading tetap (mail/lock) - satu-satunya alasan ini bukan
// <input> polos: menyisipkan ikon di dalam field butuh wrapper relative +
// padding kiri yang pas, dipakai berulang untuk email/password/confirm di
// bawah jadi disatukan di sini ketimbang diketik ulang 3x.
function IconField({
  icon: Icon,
  trailing,
  className = "",
  ...rest
}: React.ComponentProps<"input"> & { icon: React.ElementType; trailing?: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        {...rest}
        className={`w-full bg-soft-gray rounded-md py-3 pl-10 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container ${trailing ? "pr-10" : "pr-3"} ${className}`}
      />
      {trailing}
    </div>
  );
}

export function CredentialForm({ action, googleAction, mode, returnTo }: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {} as AuthFormState);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorId = "credential-error";
  const passwordHintId = "password-hint";
  const invalid = Boolean(state?.errorKey);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (invalid) emailRef.current?.focus();
  }, [invalid]);

  const toggleBtnClass =
    "absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  return (
    <form action={formAction} className="flex flex-col gap-2 lg:gap-1.5" noValidate>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className="flex flex-col gap-2 lg:gap-1.5">
        <label htmlFor="email" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {t("auth.emailLabel")} <span className="text-error" aria-hidden="true">*</span>
        </label>
        <IconField
          ref={emailRef}
          icon={Mail}
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          placeholder={t("auth.emailPlaceholder")}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
        />
      </div>

      <div className="flex flex-col gap-2 lg:gap-1.5">
        <label htmlFor="password" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {t("auth.passwordLabel")} <span className="text-error" aria-hidden="true">*</span>
        </label>
        <IconField
          icon={Lock}
          id="password"
          type={showPassword ? "text" : "password"}
          name="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : mode === "signup" ? passwordHintId : undefined}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className={toggleBtnClass}
            >
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          }
        />
        {mode === "signup" && (
          <span id={passwordHintId} className="text-label-caps text-on-surface-variant">
            {t("auth.passwordHint")}
          </span>
        )}
      </div>

      {mode === "signup" && (
        <div className="flex flex-col gap-2 lg:gap-1.5">
          <label htmlFor="confirm" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            {t("auth.confirmLabel")} <span className="text-error" aria-hidden="true">*</span>
          </label>
          <IconField
            icon={Lock}
            id="confirm"
            type={showConfirm ? "text" : "password"}
            name="confirm"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            trailing={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? t("auth.hidePassword") : t("auth.showPassword")}
                className={toggleBtnClass}
              >
                {showConfirm ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            }
          />
        </div>
      )}

      {mode === "signin" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-outline-variant bg-surface-container-low px-3 py-3 text-left transition-colors hover:bg-surface-container focus-within:ring-2 focus-within:ring-primary-container focus-within:ring-offset-2 focus-within:ring-offset-surface-container-lowest">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            value="true"
            aria-describedby="remember-description"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-outline accent-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          <span className="min-w-0">
            <span className="block text-body-sm font-medium text-on-background">{t("auth.loginRemember")}</span>
            <span id="remember-description" className="mt-0.5 block text-body-sm text-on-surface-variant">
              {t("auth.loginRememberDesc")}
            </span>
          </span>
        </label>
      )}

      {state?.errorKey && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2 bg-error-container/40 border-l-4 border-error rounded-r-lg p-3"
        >
          <AlertCircle className="text-error shrink-0 mt-0.5" size={16} />
          <p className="text-body-sm text-on-background">{t(state.errorKey, state.vars)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-[background-color,transform] flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        {mode === "signup" ? t("auth.submitSignUp") : t("auth.submitSignIn")}
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        )}
      </button>

      {mode === "signin" && googleAction && (
        <>
          <div className="flex items-center gap-3 my-1">
            <span className="h-px flex-1 bg-outline-variant" />
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("auth.or")}</span>
            <span className="h-px flex-1 bg-outline-variant" />
          </div>
          <button
            type="submit"
            formAction={googleAction}
            aria-label={t("auth.googleSignInAria")}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-outline-variant bg-surface-container-lowest py-3.5 text-body-md font-medium text-on-background transition-[background-color,transform] hover:bg-surface-container-low active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
              />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
              />
            </svg>
            {t("auth.googleContinue")}
          </button>
        </>
      )}

      {mode === "signin" && (
        <p className="text-body-sm text-center -mt-1">
          <Link
            href="/reset-password"
            className="text-on-surface-variant hover:text-on-background underline decoration-transparent hover:decoration-current underline-offset-4 transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {t("auth.forgotPassword")}
          </Link>
        </p>
      )}

      {mode === "signin" ? (
        <p className="text-body-sm text-on-surface-variant text-center">
          {t("auth.noAccount")}{" "}
          <Link
            href="/signup"
            className="text-primary-container font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {t("auth.signupHere")}
          </Link>
        </p>
      ) : (
        <p className="text-body-sm text-on-surface-variant text-center">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="text-primary-container font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            {t("auth.loginHere")}
          </Link>
        </p>
      )}
    </form>
  );
}
