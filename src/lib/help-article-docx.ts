import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import type { helpArticles } from "@/db/schema";

type HelpArticle = typeof helpArticles.$inferSelect;

// Satu sumber (artikel Help Center) diekspor jadi .docx supaya bisa langsung
// dipakai sebagai SOP resmi ke BPH/pusat, bukan dokumen Word terpisah yang
// harus dijaga manual. Pemisah paragraf sama dengan /help/[slug] (publik).
export async function helpArticleToDocx(article: HelpArticle, authorName: string | null): Promise<Buffer> {
  const paragraphs = (article.content ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const updated = new Date(article.updatedAt).toLocaleDateString("id-ID", { dateStyle: "long" });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: article.section, heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: article.title, heading: HeadingLevel.TITLE }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Diperbarui ${updated}${authorName ? ` oleh ${authorName}` : ""}`,
                italics: true,
                size: 20,
              }),
            ],
            spacing: { after: 300 },
          }),
          ...(paragraphs.length > 0
            ? paragraphs.map((p) => new Paragraph({ children: [new TextRun(p)], spacing: { after: 200 } }))
            : [new Paragraph({ children: [new TextRun("Belum ada isi.")] })]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
