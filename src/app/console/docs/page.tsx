import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { Plus, FileText, History } from "lucide-react";
import { CollapsibleSection } from "@/components/console/collapsible-section";

export default async function ConsoleDocsPage() {
  const articles = await db.select().from(helpArticles);
  const bySection = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    (acc[a.section] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Dokumentasi &amp; Bantuan</h1>
          <p className="text-body-md text-on-surface-variant">
            Panduan penggunaan console, ditulis oleh pengurus untuk pengurus berikutnya.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <a
            href="/console/docs/changelog"
            className="flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-surface-container-low transition-colors"
          >
            <History size={16} /> Changelog
          </a>
          <a
            href="/console/docs/new"
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <Plus size={16} /> Tulis Panduan
          </a>
        </div>
      </div>

      {Object.keys(bySection).length === 0 ? (
        <div className="flex flex-col items-center text-center py-24">
          <FileText className="text-outline-variant mb-4" size={40} />
          <p className="text-body-md text-on-surface-variant">Belum ada panduan yang ditulis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(bySection).map(([section, items]) => (
            <CollapsibleSection key={section} title={section}>
              <div className="flex flex-col gap-2">
                {items.map((a) => (
                  <a
                    key={a.id}
                    href={`/console/docs/${a.slug}`}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-background hover:bg-surface-container-low transition-colors"
                  >
                    {a.title}
                  </a>
                ))}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      )}
    </div>
  );
}
