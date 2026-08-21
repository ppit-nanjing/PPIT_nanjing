import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LegalNav } from "@/components/legal-nav";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export default async function PrivacyPage() {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 flex flex-col md:flex-row gap-10">
        <LegalNav active="privacy" />
        <article className="w-full max-w-3xl">
          <h1 className="text-headline-lg text-on-background mb-8">{t("legal.privacyTitle")}</h1>
          <div className="flex flex-col gap-6 text-body-md text-on-surface-variant">
            <p>{t("legal.privacyIntro")}</p>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyCollected")}</h2>
              <p>{t("legal.privacyCollectedBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyAuth")}</h2>
              <p>{t("legal.privacyAuthBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyUse")}</h2>
              <p>{t("legal.privacyUseBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyEmail")}</h2>
              <p>
                {t("legal.privacyEmailBody")}{" "}
                <Link href="/profile" className="text-primary-container underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  {t("profile.title")}
                </Link>
                {t("legal.privacyEmailAfter")}
              </p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyStorage")}</h2>
              <p>{t("legal.privacyStorageBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacySharing")}</h2>
              <p>{t("legal.privacySharingBody")}</p>
            </section>
            <section>
              <h2 className="text-headline-md text-on-background mb-2">{t("legal.privacyRights")}</h2>
              <p>
                {t("legal.privacyRightsBody")}{" "}
                <Link href="/profile" className="text-primary-container underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  {t("profile.title")}
                </Link>
                {t("legal.privacyRightsAfter")}
              </p>
            </section>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
