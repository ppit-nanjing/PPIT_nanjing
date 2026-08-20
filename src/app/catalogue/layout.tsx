import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CatalogueTabs } from "@/components/catalogue/catalogue-tabs";

export const metadata = {
  title: "Katalog & Kemitraan - PPIT Nanjing",
  description: "Merchandise PPIT Nanjing, donasi untuk mendukung program, dan kemitraan sponsor.",
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-6">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Katalog</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Merchandise &amp; Kemitraan
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
