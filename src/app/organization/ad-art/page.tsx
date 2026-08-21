import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationDocuments } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          {t("org.adart.officialDoc")}
        </span>
        <h1 className="text-headline-lg text-on-background mb-6">{t("org.adart.title")}</h1>
        <p className="text-body-lg text-on-surface-variant mb-10">
          {t("org.adart.intro")}
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <div className="w-14 h-14 rounded-lg bg-primary-container/10 flex items-center justify-center shrink-0">
            <FileText className="text-primary-container" size={26} aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="text-headline-md text-on-background">{doc?.title ?? t("org.adart.docFallback")}</h2>
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
              className="flex items-center justify-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <Download size={16} aria-hidden /> {t("org.adart.download")}
            </a>
          )}
        </div>

        {doc?.fileUrl && (
          <div className="mt-8 border border-outline-variant rounded-xl overflow-hidden">
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
