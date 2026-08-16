import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { Newspaper } from "lucide-react";

export type NewsCardArticle = {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  coverImageUrl: string | null;
  category: string | null;
  publishedAt: Date | null;
};

function formatShort(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID");
}

/**
 * Grid article card for the /news listing. Wrapped in <Reveal> for a
 * staggered scroll-in, with a hover lift, cover zoom, and title color
 * shift. Shared by the "Artikel Lainnya" grid and (optionally) related
 * articles on the detail page.
 */
export function NewsCard({ article, index = 0 }: { article: NewsCardArticle; index?: number }) {
  const excerpt =
    article.content && article.content.length > 0
      ? article.content.slice(0, 140) + (article.content.length > 140 ? "…" : "")
      : "";

  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/news/${article.slug}`}
        className="group block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
      >
        <div className="relative h-48 bg-surface-container-low overflow-hidden">
          {article.coverImageUrl ? (
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Newspaper className="text-outline-variant" size={36} />
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            {article.category && (
              <span className="text-label-caps text-primary-container uppercase">{article.category}</span>
            )}
            {article.category && article.publishedAt && <span className="text-secondary">&bull;</span>}
            <p className="text-label-caps text-on-surface-variant uppercase">
              {formatShort(article.publishedAt)}
            </p>
          </div>
          <h3 className="text-headline-md text-on-background mb-2 group-hover:text-primary-container transition-colors">
            {article.title}
          </h3>
          {excerpt && <p className="text-body-md text-on-surface-variant line-clamp-3">{excerpt}</p>}
        </div>
      </Link>
    </Reveal>
  );
}
