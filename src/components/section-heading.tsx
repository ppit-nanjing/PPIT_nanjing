import { ArrowRight } from "lucide-react";

/**
 * Shared section header: kicker (eyebrow) + title + optional "view all" link.
 * Used by the Cities, Latest Events, and Latest News sections on the home page
 * to remove the repeated header markup.
 */
export function SectionHeading({
  kicker,
  title,
  href,
  linkLabel = "Lihat Semua",
  description,
}: {
  kicker: string;
  title: string;
  href?: string;
  linkLabel?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-outline-variant pb-6">
      <div>
        <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
          {kicker}
        </span>
        <h2 className="text-headline-lg text-on-background">{title}</h2>
        {description && (
          <p className="text-body-md text-on-surface-variant mt-3 max-w-2xl">{description}</p>
        )}
      </div>
      {href && (
        <a
          href={href}
          className="hidden md:flex items-center gap-1 text-label-caps text-primary-container hover:text-primary transition-colors shrink-0"
        >
          {linkLabel} <ArrowRight size={16} />
        </a>
      )}
    </div>
  );
}
