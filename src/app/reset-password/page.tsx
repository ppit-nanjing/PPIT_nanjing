import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthBrand } from "@/components/auth/auth-brand";
import { DecoRule } from "@/components/deco/deco-rule";
import { auth } from "@/auth";
import { getT } from "@/lib/i18n/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requestPasswordReset, completePasswordReset } from "@/app/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { t } = await getT();
  const session = await auth();
  if (session) redirect("/");

  const { token } = await searchParams;
  const mode: "request" | "complete" = token ? "complete" : "request";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-container rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-surface-container-highest rounded-full blur-[100px]" />
      </div>

      <div className="max-w-sm w-full relative z-10">
        <div className="deco-frame relative overflow-hidden bg-surface-container-lowest rounded-lg p-8 shadow-[0_4px_24px_rgba(29,27,20,0.06)] text-center">
          <AuthBrand />
          <h1 className="text-headline-lg text-heading mb-3">
            {mode === "request" ? t("auth.resetRequestTitle") : t("auth.resetNewTitle")}
          </h1>
          <DecoRule className="mb-4" />
          <p className="text-body-md text-on-surface-variant mb-6">
            {mode === "request" ? t("auth.resetRequestIntro") : t("auth.resetNewIntro")}
          </p>

          {mode === "request" ? (
            <ResetPasswordForm action={requestPasswordReset} mode="request" />
          ) : (
            <ResetPasswordForm action={completePasswordReset} mode="complete" token={token} />
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <ArrowLeft size={14} /> {t("auth.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
