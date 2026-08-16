import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { newsArticles, users } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { NewsCard } from "@/components/news-card";
import { ReadingProgress } from "@/components/reading-progress";
import { ArticleShare } from "@/components/article-share";
import { ArrowLeft } from "lucide-react";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [row] = await db
    .select({ article: newsArticles, authorName: users.name })
    .from(newsArticles)
    .leftJoin(users, eq(newsArticles.authorId, users.id))
    .where(eq(newsArticles.slug, slug));

  if (!row) notFound();
  const { article: a, authorName } = row;

  const wordCount = (a.content ?? "").trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.round(wordCount / 200));
  const paragraphs = (a.content ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const candidates = await db
    .select()
    .from(newsArticles)
    .where(and(eq(newsArticles.status, "published")))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(4);
  const related = candidates.filter((x) => x.id !== a.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <ReadingProgress />
      <SiteNav />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <a
          href="/news"
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Kembali ke Berita
        </a>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-caps uppercase text-on-surface-variant mb-4">
          {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>}
          {authorName && (
            <>
              <span className="text-secondary">&bull;</span>
              <span>{authorName}</span>
            </>
          )}
          {a.category && (
            <>
              <span className="text-secondary">&bull;</span>
              <span className="text-primary-container">{a.category}</span>
            </>
          )}
          <span className="text-secondary">&bull;</span>
          <span>{readMin} min baca</span>
        </div>

        <AnimatedHeroHeading
          words={a.title.split(" ")}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-8 leading-tight"
        />

        {a.coverImageUrl && (
          <Reveal>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.coverImageUrl}
              alt={a.title}
              className="w-full rounded-xl mb-10 object-cover max-h-[420px]"
            />
          </Reveal>
        )}

        <div className="flex items-center justify-between gap-4 mb-10 pb-6 border-b border-outline-variant">
          <ArticleShare />
        </div>

        <article className="flex flex-col gap-5 text-body-lg text-on-surface-variant leading-relaxed">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>{a.content}</p>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-outline-variant">
            <Reveal>
              <h2 className="text-headline-lg text-on-background mb-8">Baca Juga</h2>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((r, i) => (
                <NewsCard
                  key={r.id}
                  index={i}
                  article={{
                    id: r.id,
                    slug: r.slug,
                    title: r.title,
                    content: r.content,
                    coverImageUrl: r.coverImageUrl,
                    category: r.category,
                    publishedAt: r.publishedAt,
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
