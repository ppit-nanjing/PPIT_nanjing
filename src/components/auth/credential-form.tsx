"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AuthFormState } from "@/app/actions/auth";

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  mode: "signin" | "signup";
};

export function CredentialForm({ action, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as AuthFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nama@mail.com"
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kata Sandi</span>
        <input
          type="password"
          name="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="••••••••"
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      </label>

      {mode === "signup" && (
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Konfirmasi Kata Sandi</span>
          <input
            type="password"
            name="confirm"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </label>
      )}

      {state.error && (
        <div className="flex items-start gap-2 bg-error-container/40 border-l-4 border-error rounded-r-lg p-3">
          <AlertCircle className="text-error shrink-0 mt-0.5" size={16} />
          <p className="text-body-sm text-on-background">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3.5 rounded-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        {mode === "signup" ? "Daftar" : "Masuk"}
      </button>

      {mode === "signin" ? (
        <p className="text-body-sm text-on-surface-variant text-center">
          Belum punya akun?{" "}
          <Link href="/signup" className="text-primary-container font-medium hover:underline">
            Daftar di sini
          </Link>
        </p>
      ) : (
        <p className="text-body-sm text-on-surface-variant text-center">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-primary-container font-medium hover:underline">
            Masuk di sini
          </Link>
        </p>
      )}
    </form>
  );
}
