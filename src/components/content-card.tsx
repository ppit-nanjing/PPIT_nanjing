import { CalendarDays, Newspaper } from "lucide-react";

/**
 * Shared content card for the home page's Latest Events and Latest News grids.
 * Unifies the near-identical card markup that was duplicated across both lists.
 */
export function ContentCard({
  href,
  imageUrl,
  eyebrow,
  meta,
  title,
  excerpt,
  fallbackIcon = "calendar",
  metaIcon = true,
}: {
  href: string;
  imageUrl?: string | null;
  eyebrow?: string | null;
  meta?: string;
  title: string;
  excerpt?: string | null;
  fallbackIcon?: "calendar" | "news";
  metaIcon?: boolean;
}) {
  const Icon = fallbackIcon === "news" ? Newspaper : CalendarDays;

  return (
    <a
      href={href}
      className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col"
    >
      <div className="h-44 bg-surface-container-low overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="text-outline-variant" size={28} />
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        {eyebrow && (
          <span className="text-label-caps uppercase tracking-wide text-primary-container mb-2">{eyebrow}</span>
        )}
        {meta && (
          <div className={`flex items-center gap-2 text-label-caps text-secondary mb-3 ${metaIcon ? "" : "uppercase"}`}>
            {metaIcon && <CalendarDays size={14} />}
            {meta}
          </div>
        )}
        <h3 className="text-headline-md text-on-background mb-2">{title}</h3>
        {excerpt && <p className="text-body-md text-on-surface-variant line-clamp-2">{excerpt}</p>}
      </div>
    </a>
  );
}
