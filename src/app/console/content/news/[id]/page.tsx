import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { upsertNewsArticle } from "@/app/actions/admin-content";
import { FileUpload } from "@/components/upload/file-upload";
import { AIImproveButton } from "@/components/ai/ai-improve-button";

export default async function EditNewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("content");
  const { id } = await params;
  const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
  if (!article) notFound();

  return (
    <div className="px-8 py-10 max-w-2xl">
      <h1 className="text-headline-lg text-on-background mb-8">Edit Berita</h1>
      <form action={upsertNewsArticle.bind(null, article.id)} className="flex flex-col gap-6">
        <input name="title" defaultValue={article.title} required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <div className="grid grid-cols-2 gap-4">
            <FileUpload
              name="coverImageUrl"
              folder="news"
              label="Foto Sampul"
              placeholder="URL atau unggah gambar"
              defaultValue={article.coverImageUrl ?? ""}
            />
            <input
              name="category"
              defaultValue={article.category ?? ""}
              placeholder="Kategori (opsional)"
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </div>
        <div>
          <textarea
            id="news-content"
            name="content"
            defaultValue={article.content ?? ""}
            rows={10}
            className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full"
          />
          <AIImproveButton context="news" targetId="news-content" className="mt-1" />
        </div>
        <label className="flex items-center gap-2 text-body-md text-on-background">
          <input type="checkbox" name="publish" defaultChecked={article.status === "published"} className="w-4 h-4" />
          Dipublikasikan
        </label>
        <button
          type="submit"
          className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
        >
          Simpan Perubahan
        </button>
      </form>
    </div>
  );
}
