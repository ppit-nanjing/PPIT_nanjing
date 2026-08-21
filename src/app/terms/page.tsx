import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LegalNav } from "@/components/legal-nav";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export default async function TermsPage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 flex flex-col md:flex-row gap-10">
        <LegalNav active="terms" />
        <article className="w-full max-w-3xl">
          <h1 className="text-headline-lg text-on-background mb-8">{t("legal.termsTitle")}</h1>
          <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
            <p>{t("legal.termsIntro")}</p>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsEligibility")}</h2>
              <p>{t("legal.termsEligibilityBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsConduct")}</h2>
              <p>{t("legal.termsConductBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsAccount")}</h2>
              <p>{t("legal.termsAccountBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsContent")}</h2>
              <p>{t("legal.termsContentBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsSensus")}</h2>
              <p>
                {t("legal.termsSensusBody")}{" "}
                <Link href="/privacy" className="text-primary-container underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  {t("legal.navPrivacy")}
                </Link>{" "}
                {t("legal.termsSensusAfter")}
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsInventory")}</h2>
              <p>{t("legal.termsInventoryBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.termsChanges")}</h2>
              <p>{t("legal.termsChangesBody")}</p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
