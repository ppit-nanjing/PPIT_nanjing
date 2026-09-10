"use client";

import { motion } from "motion/react";

/**
 * Hero headline stagger animation - Motion & Animation.md Tier 1
 * ("Hero Headlines: Character/Word stagger, Bottom -> Up").
 * Honors prefers-reduced-motion automatically via Motion's built-in support.
 *
 * The entrance is transform-only (`y`, no opacity gate): this is usually the
 * page's <h1>, so it must be readable before hydration and on a crawl - Motion
 * renders the `initial` inline style server-side, and a hidden-until-JS headline
 * is a real risk for slow connections and search indexing. It rises into place
 * when JS runs; without JS it simply sits at rest.
 *
 * `as` is "h1" by default. The footer's join card passes "h2" - it wants this
 * exact stagger at display scale but must not emit a second <h1> per page.
 */
export function AnimatedHeroHeading({
  words,
  className,
  as = "h1",
}: {
  words: string[];
  className?: string;
  as?: "h1" | "h2";
}) {
  const MotionTag = as === "h2" ? motion.h2 : motion.h1;
  return (
    <MotionTag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </MotionTag>
  );
}
