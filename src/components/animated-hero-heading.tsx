"use client";

import { motion } from "motion/react";

/**
 * Hero headline stagger animation - Motion & Animation.md Tier 1
 * ("Hero Headlines: Character/Word stagger, Bottom -> Up").
 * Honors prefers-reduced-motion automatically via Motion's built-in support.
 */
export function AnimatedHeroHeading({ words, className }: { words: string[]; className?: string }) {
  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}
