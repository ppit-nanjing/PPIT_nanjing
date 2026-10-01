import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
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

      <PageHeader eyebrow={t("catalogue.kicker")} title={t("catalogue.title")}>
        <CatalogueTabs />
      </PageHeader>

      <div className="h-10" aria-hidden="true" />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
