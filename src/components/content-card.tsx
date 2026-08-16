import { CalendarDays, Newspaper, ArrowRight } from "lucide-react";
import Image from "next/image";

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
      aria-label={`Baca selengkapnya: ${title}`}
      className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative h-44 bg-surface-container-low overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="text-outline-variant" size={28} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        {eyebrow && (
          <span className="inline-block w-fit bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide px-2 py-0.5 rounded-md mb-2">
            {eyebrow}
          </span>
        )}
        {meta && (
          <div className={`flex items-center gap-2 text-label-caps text-secondary mb-3 ${metaIcon ? "" : "uppercase"}`}>
            {metaIcon && <CalendarDays size={14} aria-hidden="true" />}
            <span>{meta}</span>
          </div>
        )}
        <h3 className="text-headline-md text-on-background mb-2 text-balance">{title}</h3>
        {excerpt && <p className="text-body-md text-on-surface-variant line-clamp-2 text-pretty">{excerpt}</p>}
        <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary-container px-3 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors group-hover:bg-primary">
          Baca <ArrowRight size={14} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        </span>
      </div>
    </a>
  );
}
