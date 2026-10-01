import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationDocuments } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { FileText, Download } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

export default async function AdArtPage() {
  const { t, locale } = await getT();
  const [doc] = await db
    .select()
    .from(organizationDocuments)
    .where(eq(organizationDocuments.type, "ad_art"))
    .orderBy(desc(organizationDocuments.publishedAt))
    .limit(1);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader eyebrow={t("org.adart.officialDoc")} title={t("org.adart.title")} intro={t("org.adart.intro")} />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-12">
        <div className="deco-frame bg-surface-container-lowest rounded-lg p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <div className="medal-ring w-14 h-14 shrink-0">
            <FileText className="text-gold-ink" size={24} aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="text-headline-md text-heading">{doc?.title ?? t("org.adart.docFallback")}</h2>
            <p className="text-body-md text-on-surface-variant">
              {doc
                ? t("org.adart.versionLine", {
                    version: doc.version ?? t("org.adart.latest"),
                    date: doc.publishedAt.toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "long" }),
                  })
                : t("org.adart.noDoc")}
            </p>
          </div>
          {doc?.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("org.adart.downloadAria", { title: doc.title })}
              className="deco-btn flex items-center justify-center gap-2 bg-accent text-on-accent text-label-caps uppercase px-5 py-3 rounded-md hover:brightness-95 transition-[filter] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <Download size={16} aria-hidden /> {t("org.adart.download")}
            </a>
          )}
        </div>

        {doc?.fileUrl && (
          <div className="mt-8 border border-outline-variant rounded-lg overflow-hidden">
            <iframe src={doc.fileUrl} title={doc.title} className="w-full h-[70vh]" />
          </div>
        )}

        <Link
          href="/organization/ad-art/review"
          className="inline-flex items-center gap-2 text-label-caps text-primary-container hover:text-primary transition-colors mt-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          {t("org.adart.readGuide")} &rarr;
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
