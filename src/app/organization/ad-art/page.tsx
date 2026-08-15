import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationDocuments } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { FileText, Download } from "lucide-react";

export default async function AdArtPage() {
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
          Dokumen Resmi
        </span>
        <h1 className="text-headline-lg text-on-background mb-6">Anggaran Dasar &amp; Rumah Tangga</h1>
        <p className="text-body-lg text-on-surface-variant mb-10">
          AD/ART merupakan dokumen fundamental organisasi yang memuat Anggaran Dasar (AD) dan
          Anggaran Rumah Tangga (ART) &mdash; landasan hukum dan operasional PPIT Nanjing.
        </p>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex items-center gap-6">
          <div className="w-14 h-14 rounded-lg bg-primary-container/10 flex items-center justify-center shrink-0">
            <FileText className="text-primary-container" size={26} />
          </div>
          <div className="flex-1">
            <h2 className="text-headline-md text-on-background">AD/ART PPIT Nanjing</h2>
            <p className="text-body-md text-on-surface-variant">
              {doc ? `Versi ${doc.version ?? "terbaru"}` : "Belum ada dokumen yang diunggah admin."}
            </p>
          </div>
          {doc?.fileUrl && (
            <a
              href={doc.fileUrl}
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors shrink-0"
            >
              <Download size={16} /> Unduh PDF
            </a>
          )}
        </div>

        <a
          href="/organization/ad-art/review"
          className="inline-flex items-center gap-2 text-label-caps text-primary-container hover:text-primary transition-colors mt-6"
        >
          Baca Ringkasan Panduan &rarr;
        </a>
      </main>

      <SiteFooter />
    </div>
  );
}
