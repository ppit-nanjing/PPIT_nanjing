import { CalendarDays, Newspaper } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon: "calendar" | "news";
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const Icon = icon === "news" ? Newspaper : CalendarDays;

  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-16 gap-3">
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-low text-primary-container" aria-hidden="true">
        <Icon size={24} />
      </span>
      <h3 className="text-headline-md text-on-background">{title}</h3>
      <p className="text-body-md text-on-surface-variant max-w-md">{description}</p>
      <a
        href={ctaHref}
        className="mt-2 inline-flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {ctaLabel}
      </a>
    </div>
  );
}
