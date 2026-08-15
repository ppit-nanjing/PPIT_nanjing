import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { helpArticles, users } from "@/db/schema";
import { upsertHelpArticle } from "@/app/actions/admin-docs";

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
    <div className="px-8 py-10 max-w-2xl">
      <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2 block">
        {article.section}
      </span>
      <h1 className="text-headline-lg text-on-background mb-2">{article.title}</h1>
      <p className="text-label-caps text-on-surface-variant mb-8">
        Diperbarui {new Date(article.updatedAt).toLocaleDateString("id-ID")}
        {authorName ? ` oleh ${authorName}` : ""}
      </p>

      {article.content && (
        <p className="text-body-lg text-on-surface-variant whitespace-pre-wrap mb-10">{article.content}</p>
      )}

      <details className="bg-surface-container-lowest border border-outline-variant rounded-xl">
        <summary className="px-6 py-4 cursor-pointer text-label-caps text-primary-container uppercase tracking-wide">
          Edit Panduan Ini
        </summary>
        <form action={upsertHelpArticle.bind(null, article.id)} className="px-6 pb-6 flex flex-col gap-4">
          <input name="title" defaultValue={article.title} required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <input name="section" defaultValue={article.section} required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <textarea name="content" defaultValue={article.content ?? ""} rows={8} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Perubahan
          </button>
        </form>
      </details>
    </div>
  );
}
