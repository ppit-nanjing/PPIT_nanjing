import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CatalogueTabs } from "@/components/catalogue/catalogue-tabs";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("catalogue.metaTitle"), description: t("catalogue.metaDesc") };
}

export default async function CatalogueLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-6">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("catalogue.kicker")}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          {t("catalogue.title")}
        </h1>
        <CatalogueTabs />
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
