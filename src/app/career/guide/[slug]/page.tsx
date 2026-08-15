import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default async function CareerGuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article] = await db.select().from(careerGuideArticles).where(eq(careerGuideArticles.slug, slug));
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        {article.category && (
          <span className="text-label-caps uppercase tracking-wide text-primary-container mb-3 block">
            {article.category}
          </span>
        )}
        <h1 className="text-headline-lg text-on-background mb-8">{article.title}</h1>
        <div className="text-body-lg text-on-surface-variant whitespace-pre-wrap">{article.content}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
