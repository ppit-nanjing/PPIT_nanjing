"use client";

import { motion } from "motion/react";

/**
 * Word-by-word blur-in reveal, triggered on scroll into view. Same family as
 * AnimatedHeroHeading (bottom-up word stagger) but for body paragraphs -
 * ported from the EnhancedAboutText reference, ~doc's Tier 2 "Section
 * Entrance" (600ms, scroll-triggered) rather than a separate JS
 * IntersectionObserver, since `motion`'s whileInView does the same job with
 * less code and is already the project's one approved animation dependency.
 * Honors prefers-reduced-motion automatically via Motion's built-in support.
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
            hidden: { opacity: 0, filter: "blur(4px)", y: 8 },
            visible: { opacity: 1, filter: "blur(0px)", y: 0 },
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
