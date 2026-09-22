import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { LifeBuoy, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

// Panduan publik - subset artikel Help Center (help_articles.isPublic) yang
// pengurus tandai relevan buat anggota/pengguna umum, bukan panduan
// operasional console. Sumbernya sama dengan /console/docs, cuma disaring.
export default async function HelpPage() {
  const { t } = await getT();
  const articles = await db.select().from(helpArticles).where(eq(helpArticles.isPublic, true));
  const bySection = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    (acc[a.section] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 border-b border-outline-variant">
        <AnimatedHeroHeading
          words={[t("help.title")]}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
        />
        <p className="text-body-lg text-on-surface-variant max-w-2xl">{t("help.intro")}</p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12">
        {Object.keys(bySection).length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-low mb-6">
              <LifeBuoy className="text-outline-variant" size={32} aria-hidden="true" />
            </div>
            <h2 className="text-headline-md text-on-background mb-2">{t("help.emptyTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-md">{t("help.emptyDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {Object.entries(bySection).map(([section, items]) => (
              <section key={section}>
                <h2 className="text-headline-md text-on-background mb-5 pb-3 border-b border-outline-variant">
                  {section}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((a) => (
                    <Link
                      key={a.id}
                      href={`/help/${a.slug}`}
                      className="group flex items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-4 text-body-md text-on-background hover:bg-surface-container-low hover:-translate-y-0.5 transition-[background-color,transform] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {a.title}
                      <ArrowRight
                        size={16}
                        className="shrink-0 text-primary-container transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
