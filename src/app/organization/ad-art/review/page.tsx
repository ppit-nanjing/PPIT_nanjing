import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationDocuments } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Gavel, Download } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

const SECTIONS = [
  { id: "kerangka-hukum", titleKey: "org.adart.review.legal" },
  { id: "etika-anggota", titleKey: "org.adart.review.ethics" },
  { id: "peminjaman-inventaris", titleKey: "org.adart.review.loan" },
  { id: "amandemen", titleKey: "org.adart.review.amend" },
] as const;

export default async function ReviewAdArtGuidelinesPage() {
  const { t } = await getT();
  const [doc] = await db
    .select()
    .from(organizationDocuments)
    .where(eq(organizationDocuments.type, "ad_art"))
    .orderBy(desc(organizationDocuments.publishedAt))
    .limit(1);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 md:grid-cols-12 gap-8">
        <aside className="md:col-span-3">
          <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
            <h3 className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-4">{t("org.adart.review.toc")}</h3>
            <ul className="flex flex-col gap-3 text-body-md">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-on-background hover:text-primary-container transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
                    {i + 1}. {t(s.titleKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article className="md:col-span-9 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-12">
          <header className="mb-10 pb-8 border-b border-outline-variant">
            <div className="inline-flex items-center gap-2 bg-surface-container-high text-primary-container px-3 py-1 rounded-full text-label-caps uppercase mb-4">
              <Gavel size={14} aria-hidden /> {t("org.adart.officialDoc")}
            </div>
            <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
              {t("org.adart.review.title")}
            </h1>
            <p className="text-quote-text text-on-surface-variant max-w-3xl">
              {t("org.adart.review.intro")}
            </p>
          </header>

          <div className="flex flex-col gap-10">
            <section id="kerangka-hukum" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  1
                </span>
                {t("org.adart.review.legal")}
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>{t("org.adart.review.legalBody")}</p>
                <ul className="list-disc pl-6 flex flex-col gap-2 marker:text-primary-container">
                  <li>{t("org.adart.review.legalPoint1")}</li>
                  <li>{t("org.adart.review.legalPoint2")}</li>
                  <li>{t("org.adart.review.legalPoint3")}</li>
                </ul>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="etika-anggota" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  2
                </span>
                {t("org.adart.review.ethics")}
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>{t("org.adart.review.ethicsBody")}</p>
                <div className="bg-soft-gray p-6 rounded-md border-l-4 border-primary-container">
                  <h4 className="text-headline-md text-on-background mb-2">{t("org.adart.review.codeOfEthics")}</h4>
                  <p className="mb-0">{t("org.adart.review.ethicsBox")}</p>
                </div>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="peminjaman-inventaris" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  3
                </span>
                {t("org.adart.review.loan")}
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>{t("org.adart.review.loanBody")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-outline-variant p-5 rounded-md">
                    <h4 className="text-body-md font-semibold text-on-background mb-1">{t("org.adart.review.loanRequest")}</h4>
                    <p className="text-body-md">
                      {t("org.adart.review.loanRequestBefore")}{" "}
                      <Link href="/inventory" className="text-primary-container underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
                        {t("org.adart.review.loanRequestLink")}
                      </Link>{" "}
                      {t("org.adart.review.loanRequestAfter")}
                    </p>
                  </div>
                  <div className="border border-outline-variant p-5 rounded-md">
                    <h4 className="text-body-md font-semibold text-on-background mb-1">{t("org.adart.review.returnProtocol")}</h4>
                    <p className="text-body-md">{t("org.adart.review.returnBody")}</p>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-t border-outline-variant" />

            <section id="amandemen" className="scroll-mt-24">
              <h2 className="text-headline-lg text-on-background mb-4 flex items-center gap-3">
                <span className="bg-primary-container text-on-primary w-9 h-9 flex items-center justify-center rounded-md text-headline-md shrink-0">
                  4
                </span>
                {t("org.adart.review.amend")}
              </h2>
              <div className="text-body-md text-on-surface-variant flex flex-col gap-4">
                <p>{t("org.adart.review.amendBody")}</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-outline-variant flex flex-wrap justify-between items-center gap-4">
            <p className="text-label-caps text-on-surface-variant">
              {doc ? t("org.adart.review.lastUpdated", { version: doc.version ?? t("org.adart.latest") }) : t("org.adart.review.noDoc")}
            </p>
            {doc?.fileUrl && (
              <a
                href={doc.fileUrl}
                className="flex items-center gap-2 text-primary-container hover:text-primary transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <Download size={16} aria-hidden /> {t("org.adart.review.downloadFull")}
              </a>
            )}
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
