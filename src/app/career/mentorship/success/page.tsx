import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function MentorshipSuccessPage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main role="status" aria-live="polite" className="max-w-md mx-auto px-[var(--spacing-container-padding)] py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-primary-container" size={28} aria-hidden />
        </div>
        <h1 className="text-headline-lg text-on-background mb-2">{t("career.mentorship.successTitle")}</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          {t("career.mentorship.successDesc")}
        </p>
        <ul className="flex flex-col gap-3 text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-10">
          <li className="flex items-start gap-3 text-body-md text-on-surface-variant">
            <span className="bg-primary-container/10 text-primary-container font-bold text-label-caps w-6 h-6 flex items-center justify-center rounded-full shrink-0" aria-hidden>1</span>
            {t("career.mentorship.successStep1")}
          </li>
          <li className="flex items-start gap-3 text-body-md text-on-surface-variant">
            <span className="bg-primary-container/10 text-primary-container font-bold text-label-caps w-6 h-6 flex items-center justify-center rounded-full shrink-0" aria-hidden>2</span>
            {t("career.mentorship.successStep2")}
          </li>
          <li className="flex items-start gap-3 text-body-md text-on-surface-variant">
            <span className="bg-primary-container/10 text-primary-container font-bold text-label-caps w-6 h-6 flex items-center justify-center rounded-full shrink-0" aria-hidden>3</span>
            {t("career.mentorship.successStep3")}
          </li>
        </ul>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/career"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("career.mentorship.backToCenter")}
          </Link>
          <Link
            href="/career#panduan"
            className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("career.mentorship.exploreGuides")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
