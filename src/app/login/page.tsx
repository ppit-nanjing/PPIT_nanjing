import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Undo2 } from "lucide-react";
import { auth } from "@/auth";
import { CredentialForm } from "@/components/auth/credential-form";
import { SeasonPanel } from "@/components/auth/season-panel";
import { signInWithGoogle, signInWithPassword } from "@/app/actions/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { AuthBrand } from "@/components/auth/auth-brand";
import { DecoRule } from "@/components/deco/deco-rule";
import { PlumBlossoms, PlumSymbols } from "@/components/deco/plum-blossoms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reset?: string }>;
}) {
  const { t } = await getT();
  const { returnTo: rawReturnTo, reset } = await searchParams;
  const returnTo = safeRedirect(rawReturnTo);
  const session = await auth();
  if (session) redirect(returnTo);
  const justReset = reset === "1";

  return (
    <div className="min-h-screen lg:h-screen bg-background relative overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      {/* Panel musim hanya untuk laptop ke atas. */}
      <div className="hidden lg:block relative lg:h-auto">
        <SeasonPanel />
      </div>
      {/* Ponsel & tablet: tanpa strip musim - bunga plum (komponen yang sama
          dengan beranda) melayang di belakang kartu form. */}
      <div className="lg:hidden">
        <PlumSymbols />
        <PlumBlossoms variant="hero" />
      </div>

      {/* lg: fixed viewport height + own scroll, and the card centres via
          `my-auto` (collapses instead of clipping the top if it ever overflows)
          — the page itself never scrolls, so the season panel always fills. */}
      <div className="flex flex-col items-center px-[var(--spacing-container-padding)] py-4 s:py-6 lg:h-screen lg:overflow-y-auto">
      <div className="max-w-sm w-full lg:my-auto">
        <div className="deco-frame relative overflow-hidden bg-surface-container-lowest rounded-lg p-6 lg:p-5 shadow-[0_4px_24px_rgba(29,27,20,0.06)] text-center">
          <AuthBrand />
          <h1 className="text-headline-lg text-heading mb-2">{t("auth.loginTitle")}</h1>
          <DecoRule className="mb-3" />
          <p className="text-body-sm text-on-surface-variant mb-3">
            {t("auth.loginIntro")}
          </p>

          {justReset && (
            <div role="status" className="flex items-start gap-2.5 bg-primary-container/10 border border-primary-container/20 rounded-lg px-3 py-2.5 mb-3 text-left">
              <CheckCircle2 className="text-primary-container shrink-0 mt-0.5" size={16} aria-hidden="true" />
              <p className="text-body-sm text-on-surface-variant">{t("auth.resetSuccessFlash")}</p>
            </div>
          )}

          {returnTo !== "/" && (
            <div className="flex items-start gap-2.5 bg-primary-container/10 border border-primary-container/20 rounded-lg px-3 py-2.5 mb-3 text-left">
              <Undo2 className="text-primary-container shrink-0 mt-0.5" size={16} aria-hidden="true" />
              <p className="text-body-sm text-on-surface-variant">{t("auth.loginReturnNoticeDesc")}</p>
            </div>
          )}

          <CredentialForm action={signInWithPassword} googleAction={signInWithGoogle} mode="signin" returnTo={returnTo} />
        </div>

         <div className="text-center mt-3 lg:mt-2">
           <Link
             href="/"
             className="group inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background transition-colors rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
           >
             <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" /> {t("auth.backHome")}
           </Link>
         </div>
      </div>
      </div>
    </div>
  );
}
