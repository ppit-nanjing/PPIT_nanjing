import { CalendarDays, Newspaper, ArrowRight } from "lucide-react";
import Image from "next/image";
import { getT } from "@/lib/i18n/server";

/**
 * Shared content card for the home page's Latest Events and Latest News grids.
 * Unifies the near-identical card markup that was duplicated across both lists.
 * Async server component (like GalleryCard) so its own chrome copy - the
 * "read" link and the card's aria-label - resolves through the dictionary
 * rather than being hard-coded Indonesian.
 */
export async function ContentCard({
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
  const { t } = await getT();
  const Icon = fallbackIcon === "news" ? Newspaper : CalendarDays;

  return (
    <a
      href={href}
      aria-label={t("common.readAria", { title })}
      className="group bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden hover:border-muted-gold hover:shadow-[0_14px_40px_rgba(29,27,20,0.12)] hover:-translate-y-1 transition-[box-shadow,transform] duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 flex flex-row sm:flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative w-28 min-h-[6.75rem] shrink-0 sm:w-auto sm:min-h-0 sm:h-44 bg-surface-container-low overflow-hidden border-r sm:border-r-0 sm:border-b border-outline-variant">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            loading="lazy"
            decoding="async"
            sizes="(max-width: 639px) 112px, (max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="text-outline-variant" size={28} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-3 sm:p-6 flex flex-col flex-1 min-w-0 justify-center sm:justify-start">
        {eyebrow && (
          <span className="inline-block w-fit bg-gold-ink/10 text-gold-ink text-label-caps uppercase tracking-wide px-2 py-0.5 rounded-md mb-1 sm:mb-2">
            {eyebrow}
          </span>
        )}
        {meta && (
          <div className={`flex items-center gap-2 text-label-caps text-secondary mb-1 sm:mb-3 ${metaIcon ? "" : "uppercase"}`}>
            {metaIcon && <CalendarDays size={14} aria-hidden="true" />}
            <span>{meta}</span>
          </div>
        )}
        <h3 className="text-headline-md max-sm:text-[15px] max-sm:leading-snug max-sm:line-clamp-2 text-on-background sm:mb-2 text-balance">{title}</h3>
        {excerpt && <p className="max-sm:hidden text-body-md text-on-surface-variant line-clamp-2 text-pretty">{excerpt}</p>}
        <span className="mt-4 max-sm:hidden inline-flex w-fit items-center gap-1.5 rounded-md bg-primary-container px-3 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors group-hover:bg-primary">
          {t("common.read")} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </span>
      </div>
    </a>
  );
}
