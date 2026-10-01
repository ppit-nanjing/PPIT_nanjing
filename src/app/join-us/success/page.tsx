import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { DecoRule } from "@/components/deco/deco-rule";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getFormMeta } from "@/app/actions/membership";
import { getT } from "@/lib/i18n/server";

export default async function JoinUsSuccessPage() {
  const meta = await getFormMeta();
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="medal-ring w-20 h-20 mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} />
        </div>
        <h1
          tabIndex={-1}
          autoFocus
          className="text-headline-lg text-heading mb-3 outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded-sm"
        >
          {t("joinus.successTitle")}
        </h1>
        <DecoRule className="mb-4" />
        <div role="status" className="text-body-md text-on-surface-variant mb-8 space-y-2">
          <p>{meta.confirmationMessage}</p>
          <p className="text-body-sm">{t("joinus.successNote")}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/events"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("joinus.viewEvents")}
          </Link>
          <Link
            href="/"
            className="deco-btn bg-accent text-on-accent text-label-caps uppercase px-6 py-3 rounded-md hover:brightness-95 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("joinus.backHome")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
