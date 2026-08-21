import { eq, and, ne, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { Video, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

function estimateReadMinutes(content: string | null): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function CareerGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db.select().from(careerGuideArticles).where(eq(careerGuideArticles.slug, slug));
  if (!article) notFound();

  const { t, locale } = await getT();

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
            <Link
              href="/career"
              aria-label={t("career.backToCenterAria")}
              className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
            >
              <ArrowLeft size={14} aria-hidden /> {t("career.centerLabel")}
            </Link>
            <div className="flex items-center gap-2 text-label-caps text-on-surface-variant">
              {article.category && (
                <span className="bg-surface-container-low px-2 py-1 rounded text-primary-container uppercase tracking-wide">
                  {article.category}
                </span>
              )}
              <span>&bull;</span>
              <span>{t("news.minRead", { n: estimateReadMinutes(article.content) })}</span>
              {article.publishedAt && (
                <>
                  <span>&bull;</span>
                  <span>{new Date(article.publishedAt).toLocaleDateString(INTL_LOCALE[locale], { day: "numeric", month: "long", year: "numeric" })}</span>
                </>
              )}
            </div>
            <h1 className="text-headline-lg text-on-background">{article.title}</h1>
          </header>

          {article.content && (
            <div className="text-body-lg text-on-surface-variant whitespace-pre-wrap leading-[1.85] max-w-2xl">
              {article.content}
            </div>
          )}
        </article>

        <aside className="md:col-span-4">
          <div aria-label={t("career.sidebarAria")} className="sticky top-24 flex flex-col gap-6">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 text-center">
              <Video className="text-primary-container mx-auto mb-4" size={32} aria-hidden />
              <h3 className="text-headline-md text-on-background mb-2">{t("career.needPractice")}</h3>
              <p className="text-body-md text-on-surface-variant mb-6">
                {t("career.needPracticeDesc")}
              </p>
              <Link
                href="/career/mentorship"
                className="block w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {t("career.joinMentorship")}
              </Link>
            </div>

            {related.length > 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="text-body-md font-bold text-on-background border-b border-outline-variant pb-4 mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-on-surface-variant" aria-hidden /> {t("career.relatedArticles")}
                </h3>
                <ul aria-label={t("career.relatedAria")} className="flex flex-col gap-1">
                  {related.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/career/guide/${a.slug}`}
                        aria-label={t("career.relatedArticleAria", { title: a.title })}
                        className="block p-2 -mx-2 rounded-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
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
