import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { newsArticles, users } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db
    .select({ article: newsArticles, authorName: users.name })
    .from(newsArticles)
    .leftJoin(users, eq(newsArticles.authorId, users.id))
    .where(eq(newsArticles.slug, slug));

  if (!article) notFound();
  const { article: a, authorName } = article;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <p className="text-label-caps text-on-surface-variant uppercase mb-3">
          {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID") : ""}
          {authorName ? ` • ${authorName}` : ""}
        </p>
        <h1 className="text-headline-lg text-on-background mb-8">{a.title}</h1>
        {a.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.coverImageUrl} alt={a.title} className="w-full rounded-xl mb-8 object-cover" />
        )}
        <div className="text-body-lg text-on-surface-variant whitespace-pre-wrap">{a.content}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
