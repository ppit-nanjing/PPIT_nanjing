import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { Newspaper, ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";

export type NewsCardArticle = {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  coverImageUrl: string | null;
  category: string | null;
  publishedAt: Date | null;
};

function formatShort(d: Date | null, locale: Locale) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "medium" });
}

function formatLong(d: Date | null, locale: Locale) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "long" });
}

/**
 * Grid article card for the /news listing. Wrapped in <Reveal> for a
 * staggered scroll-in, with a hover lift, cover zoom, and title color
 * shift. Shared by the "Artikel Lainnya" grid and (optionally) related
 * articles on the detail page.
 */
export async function NewsCard({ article, index = 0 }: { article: NewsCardArticle; index?: number }) {
  const { t, locale } = await getT();
  const excerpt =
    article.content && article.content.length > 0
      ? article.content.slice(0, 140) + (article.content.length > 140 ? "…" : "")
      : "";

  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/news/${article.slug}`}
        aria-label={t("news.readAria", { title: article.title })}
        className="group block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative h-48 bg-surface-container-low overflow-hidden">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              loading="lazy"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="text-outline-variant" size={36} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            {article.category && (
              <span className="inline-block bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide px-2 py-0.5 rounded-md">
                {article.category}
              </span>
            )}
            {article.category && article.publishedAt && <span className="text-secondary" aria-hidden="true">&bull;</span>}
            <p className="text-label-caps text-on-surface-variant uppercase" title={formatLong(article.publishedAt, locale)}>
              {formatShort(article.publishedAt, locale)}
            </p>
          </div>
          <h3 className="text-headline-md text-on-background mb-2 text-balance group-hover:text-primary-container transition-colors">
            {article.title}
          </h3>
          {excerpt && (
            <p className="text-body-md text-on-surface-variant line-clamp-3 text-pretty">{excerpt}</p>
          )}
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary-container px-3 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors group-hover:bg-primary">
            {t("news.cardRead")} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
