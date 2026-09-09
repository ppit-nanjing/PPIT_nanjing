"use client";

import { motion } from "motion/react";

/**
 * Word-by-word rise reveal, triggered on scroll into view. Same family as
 * AnimatedHeroHeading (bottom-up word stagger) but for body paragraphs -
 * ported from the EnhancedAboutText reference, ~doc's Tier 2 "Section
 * Entrance" (600ms, scroll-triggered) rather than a separate JS
 * IntersectionObserver, since `motion`'s whileInView does the same job with
 * less code and is already the project's one approved animation dependency.
 * Honors prefers-reduced-motion automatically via Motion's built-in support.
 *
 * The `hidden` state is a small transform-only rise - never `opacity: 0`, and
 * (since 2026-09-10) never `blur()` either. Motion writes `initial` as an inline
 * style server-side, so without JS - a crawler, or the seconds before hydration
 * on a slow connection behind the Great Firewall - a blurred paragraph is what
 * the reader would get. A 6px offset is invisible enough that the un-hydrated
 * state reads as finished; JS just adds the stagger.
 */
export function AnimatedRevealText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");

  return (
    <motion.p
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={{
            hidden: { y: 6 },
            visible: { y: 0 },
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}
