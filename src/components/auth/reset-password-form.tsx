"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { AuthFormState } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/client";

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "request" | "complete";
  /** Token mentah dari query, hanya untuk mode "complete". */
  token?: string;
};

export function ResetPasswordForm({ action, mode, token }: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState(action, {} as AuthFormState);
  const errorId = "reset-error";
  const invalid = Boolean(state?.errorKey);

  const fieldClass =
    "bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

  if (mode === "request" && state?.done) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 bg-primary-container/10 border border-primary-container/20 rounded-lg p-4 text-left"
      >
        <CheckCircle2 className="text-primary-container shrink-0 mt-0.5" size={18} />
        <p className="text-body-sm text-on-background">{t("auth.resetRequestDone")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {mode === "complete" && <input type="hidden" name="token" value={token ?? ""} />}

      {mode === "request" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            {t("auth.emailLabel")} <span className="text-error" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            placeholder={t("auth.emailPlaceholder")}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={fieldClass}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              {t("auth.newPasswordLabel")} <span className="text-error" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : "reset-password-hint"}
              className={fieldClass}
            />
            <span id="reset-password-hint" className="text-label-caps text-on-surface-variant">
              {t("auth.passwordHint")}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              {t("auth.confirmLabel")} <span className="text-error" aria-hidden="true">*</span>
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
        </>
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
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        {mode === "request" ? t("auth.resetRequestSubmit") : t("auth.resetNewSubmit")}
      </button>

      <p className="text-body-sm text-on-surface-variant text-center">
        <Link
          href="/login"
          className="text-primary-container font-medium hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          {t("auth.backToLogin")}
        </Link>
      </p>
    </form>
  );
}
