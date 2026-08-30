import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { CredentialForm } from "@/components/auth/credential-form";
import { signInWithGoogle, signInWithPassword } from "@/app/actions/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { t } = await getT();
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeRedirect(rawReturnTo);
  const session = await auth();
  if (session) redirect(returnTo);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[var(--spacing-container-padding)] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-container rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-surface-container-highest rounded-full blur-[100px]" />
      </div>

      <div className="max-w-sm w-full relative z-10">
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-container" />
          <span className="text-headline-md font-bold text-primary uppercase tracking-tight block mb-2">
            PPIT Nanjing
          </span>
          <h1 className="text-headline-lg text-on-background mb-3">{t("auth.loginTitle")}</h1>
          <p className="text-body-md text-on-surface-variant mb-6">
            {t("auth.loginIntro")}
          </p>

          <CredentialForm
            action={signInWithPassword}
            googleAction={signInWithGoogle}
            mode="signin"
            returnTo={returnTo}
          />
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
