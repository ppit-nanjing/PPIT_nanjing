import { upsertHelpArticle } from "@/app/actions/admin-docs";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { TextField, SelectField, TextAreaField, FormActions, primaryBtn } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";

const SECTIONS = ["Sering Dipakai", "Sering Membingungkan"];

export default function NewHelpArticlePage() {
  return (
    <div className="py-2 max-w-2xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Tulis Panduan Baru</h1>
      <CollapsibleSection title="Formulir Panduan">
        <form action={upsertHelpArticle.bind(null, null)} className="flex flex-col gap-4">
          <TextField name="title" label="Judul" required />
          <SelectField
            name="section"
            label="Bagian"
            required
            options={SECTIONS.map((s) => ({ value: s, label: s }))}
          />
          <TextAreaField name="content" label="Isi Panduan" rows={10} />
          <FormActions>
            <SubmitButton successMessage="Panduan dipublikasikan." className={primaryBtn}>Publikasikan</SubmitButton>
          </FormActions>
        </form>
      </CollapsibleSection>
    </div>
  );
}
