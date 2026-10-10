import { ArticleForm } from "@/components/console/article-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";

export default function NewHelpArticlePage() {
  return (
    <div className="py-2 max-w-2xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Tulis Panduan Baru</h1>
      <CollapsibleSection title="Formulir Panduan">
        <ArticleForm submitLabel="Publikasikan" successMessage="Panduan dipublikasikan." />
      </CollapsibleSection>
    </div>
  );
}
