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
import Image from "next/image";
import Link from "next/link";

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
        <Link
          href="/news"
          aria-label="Kembali ke daftar berita"
          className="inline-flex items-center gap-1.5 rounded-md text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke Berita
        </Link>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-caps uppercase text-on-surface-variant mb-4">
          {a.publishedAt && (
            <span>
              <time dateTime={new Date(a.publishedAt).toISOString()}>
                {new Date(a.publishedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
              </time>
            </span>
          )}
          {authorName && (
            <>
              <span className="text-secondary" aria-hidden="true">&bull;</span>
              <span className="inline-flex items-center gap-2" aria-label={`Ditulis oleh ${authorName}`}>
                <span
                  aria-hidden="true"
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-container/10 text-primary-container text-[10px] font-semibold uppercase"
                >
                  {authorName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <span>{authorName}</span>
              </span>
            </>
          )}
          {a.category && (
            <>
              <span className="text-secondary" aria-hidden="true">&bull;</span>
              <span className="text-primary-container">{a.category}</span>
            </>
          )}
          <span className="text-secondary" aria-hidden="true">&bull;</span>
          <span>{readMin} min baca</span>
        </div>

        <AnimatedHeroHeading
          words={a.title.split(" ")}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-8 leading-tight"
        />

        {a.coverImageUrl && (
          <Reveal>
            <Image
              src={a.coverImageUrl}
              alt={a.title}
              width={1200}
              height={630}
              priority
              decoding="async"
              sizes="(max-width: 768px) 100vw, 768px"
              className="w-full h-auto rounded-xl mb-10 object-cover max-h-[420px]"
            />
          </Reveal>
        )}

        <div className="flex items-center justify-between gap-4 mb-10 pb-6 border-b border-outline-variant">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
            Bagikan artikel
          </span>
          <ArticleShare />
        </div>

        <article lang="id" className="flex flex-col gap-5 text-body-lg text-on-surface-variant leading-relaxed text-pretty">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p
                key={i}
                className={i === 0 ? "first:text-on-background first:font-medium" : undefined}
              >
                {p}
              </p>
            ))
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
