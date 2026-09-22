import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { helpArticles, users } from "@/db/schema";
import { upsertHelpArticle } from "@/app/actions/admin-docs";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { TextField, SelectField, TextAreaField, ToggleSwitch, FormActions, primaryBtn } from "@/components/console/form";
import { SubmitButton } from "@/components/console/submit-button";
import { PrintButton } from "@/components/console/print-button";
import { Download } from "lucide-react";

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db
    .select({ article: helpArticles, authorName: users.name })
    .from(helpArticles)
    .leftJoin(users, eq(helpArticles.authorId, users.id))
    .where(eq(helpArticles.slug, slug));
  if (!row) notFound();
  const { article, authorName } = row;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2 block">
        {article.section}
      </span>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">{article.title}</h1>
      <p className="text-label-caps text-on-surface-variant mb-8 flex flex-wrap items-center gap-x-2">
        <span>
          Diperbarui {new Date(article.updatedAt).toLocaleDateString("id-ID")}
          {authorName ? ` oleh ${authorName}` : ""}
        </span>
        {article.isPublic && (
          <span className="bg-primary-container/10 text-primary-container px-2 py-0.5 rounded-full normal-case">
            Publik di /help
          </span>
        )}
      </p>

      {article.content && (
        <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">{article.content}</p>
      )}

      {/* print:hidden - Fase 2: dua sumber (Word/PDF) diturunkan dari artikel
          yang sama, bukan dokumen SOP terpisah yang harus dijaga manual. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-10 text-label-caps print:hidden">
        <a
          href={`/api/console/docs/${article.slug}/export`}
          download
          className="text-primary-container hover:text-primary inline-flex items-center gap-1"
        >
          <Download size={13} aria-hidden /> Unduh sebagai Word
        </a>
        <PrintButton />
      </div>

      <div className="print:hidden">
        <CollapsibleSection title="Edit Panduan Ini">
          <form action={upsertHelpArticle.bind(null, article.id)} className="flex flex-col gap-4">
            <TextField name="title" label="Judul" required defaultValue={article.title} />
            <SelectField
              name="section"
              label="Bagian"
              required
              defaultValue={article.section}
              options={["Sering Dipakai", "Sering Membingungkan"].map((s) => ({ value: s, label: s }))}
            />
            <TextAreaField name="content" label="Isi Panduan" rows={8} defaultValue={article.content} />
            <ToggleSwitch
              name="isPublic"
              label="Tampilkan di halaman publik (/help)"
              hint="Nyalakan kalau panduan ini relevan buat anggota/pengguna umum, bukan cuma pengurus."
              defaultChecked={article.isPublic}
            />
            <FormActions>
              <SubmitButton successMessage="Panduan tersimpan." className={primaryBtn}>Simpan Perubahan</SubmitButton>
            </FormActions>
          </form>
        </CollapsibleSection>
      </div>
    </div>
  );
}
