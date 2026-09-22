import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

export default async function HelpArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getT();

  // Digerbang dobel seperti /news/[slug]: artikel yang belum/tidak lagi
  // ditandai publik harus 404 lewat URL langsung, bukan cuma hilang dari
  // daftar /help.
  const [article] = await db
    .select()
    .from(helpArticles)
    .where(and(eq(helpArticles.slug, slug), eq(helpArticles.isPublic, true)));
  if (!article) notFound();

  const paragraphs = (article.content ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 rounded-md text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container hover:bg-surface-container-low transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft size={16} aria-hidden="true" /> {t("help.back")}
        </Link>

        <span className="text-label-caps uppercase tracking-wide text-primary-container mb-3 block">
          {article.section}
        </span>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4 leading-tight">
          {article.title}
        </h1>
        <p className="text-label-caps text-on-surface-variant mb-10">
          {t("help.updated", {
            date: new Date(article.updatedAt).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "long" }),
          })}
        </p>

        <article lang={locale} className="flex flex-col gap-5 text-body-lg text-on-surface-variant leading-relaxed text-pretty">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p>{t("help.noContent")}</p>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
