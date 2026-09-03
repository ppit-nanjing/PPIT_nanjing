import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Undo2 } from "lucide-react";
import { auth } from "@/auth";
import { CredentialForm } from "@/components/auth/credential-form";
import { SeasonPanel } from "@/components/auth/season-panel";
import { signInWithGoogle, signInWithPassword } from "@/app/actions/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

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
    <div className="min-h-screen bg-background relative overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      <div className="relative h-16 s:h-20 m:h-24 l:h-28 sm:h-36 lg:h-auto">
        <SeasonPanel />
      </div>

      <div className="flex items-center justify-center px-[var(--spacing-container-padding)] py-4 s:py-6 lg:py-6">
      <div className="max-w-sm w-full">
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-6 lg:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-container" />
          <span className="text-headline-md font-bold text-primary uppercase tracking-tight block mb-2">
            PPIT Nanjing
          </span>
          <h1 className="text-headline-lg text-on-background mb-2">{t("auth.loginTitle")}</h1>
          <p className="text-body-md text-on-surface-variant mb-4">
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
