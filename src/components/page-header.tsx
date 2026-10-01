import type { ReactNode } from "react";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { DecoRule } from "@/components/deco/deco-rule";

/**
 * Header for the public listing and info pages: optional gold-ink eyebrow, the
 * page's single <h1> in the display face, a line-diamond-line divider, an intro
 * line, and anything that belongs under the title (filter tabs, a back link,
 * actions) as children. Warm-cream ground with a gold hairline below, the same
 * vocabulary as the home hero without its sunburst and blossoms, so inner pages
 * stay calm.
 *
 * The heading keeps AnimatedHeroHeading's transform-only entrance (the <h1> must
 * be readable before hydration and on a crawl).
 */
export function PageHeader({
  title,
  intro,
  eyebrow,
  children,
}: {
  title: string;
  /** A plain string gets the word-by-word reveal; an element (e.g. with <strong>) is rendered as is. */
  intro?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <header className="bg-warm-cream border-b border-[var(--deco-line)]">
      <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-10 flex flex-col items-center text-center gap-4">
        {eyebrow && <p className="text-label-caps uppercase tracking-[0.3em] text-gold-ink">{eyebrow}</p>}
        <AnimatedHeroHeading
          words={[title]}
          className="text-display-hero-mobile md:text-display-hero text-heading text-balance"
        />
        <DecoRule />
        {intro &&
          (typeof intro === "string" ? (
            <AnimatedRevealText text={intro} className="text-body-lg text-on-surface-variant max-w-2xl text-pretty" />
          ) : (
            <p className="text-body-lg text-on-surface-variant max-w-2xl text-pretty">{intro}</p>
          ))}
        {children && <div className="mt-3 w-full flex flex-col items-center gap-4">{children}</div>}
      </div>
    </header>
  );
}
