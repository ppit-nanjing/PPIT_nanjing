import { eq, and, ne, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Video, FileText } from "lucide-react";

function estimateReadMinutes(content: string | null): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function CareerGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db.select().from(careerGuideArticles).where(eq(careerGuideArticles.slug, slug));
  if (!article) notFound();

  const related = await db
    .select()
    .from(careerGuideArticles)
    .where(
      article.category
        ? and(ne(careerGuideArticles.id, article.id), eq(careerGuideArticles.category, article.category))
        : ne(careerGuideArticles.id, article.id)
    )
    .orderBy(desc(careerGuideArticles.publishedAt))
    .limit(4);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <article className="md:col-span-8 flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-label-caps text-on-surface-variant">
              {article.category && (
                <span className="bg-surface-container-low px-2 py-1 rounded text-primary-container uppercase tracking-wide">
                  {article.category}
                </span>
              )}
              <span>&bull;</span>
              <span>{estimateReadMinutes(article.content)} MENIT BACA</span>
            </div>
            <h1 className="text-headline-lg text-on-background">{article.title}</h1>
          </header>

          {article.content && (
            <div className="text-body-lg text-on-surface-variant whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
          )}
        </article>

        <aside className="md:col-span-4">
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
              <Video className="text-primary-container mx-auto mb-4" size={32} />
              <h3 className="text-headline-md text-on-background mb-2">Butuh Latihan?</h3>
              <p className="text-body-md text-on-surface-variant mb-6">
                Daftar Alumni Network Mentorship untuk sesi bimbingan 1-on-1 dengan alumni PPIT
                Nanjing.
              </p>
              <a
                href="/career/mentorship"
                className="block w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3 rounded-md hover:bg-primary transition-colors"
              >
                Daftar Mentorship
              </a>
            </div>

            {related.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="text-body-md font-bold text-on-background border-b border-outline-variant pb-4 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-on-surface-variant" /> Artikel Terkait
                </h3>
                <ul className="flex flex-col gap-1">
                  {related.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/career/guide/${a.slug}`}
                        className="block p-2 -mx-2 rounded-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container transition-colors"
                      >
                        {a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
