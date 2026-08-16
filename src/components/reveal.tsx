"use client";

import { motion } from "motion/react";

/**
 * Lightweight scroll-triggered fade-up wrapper, same Motion family as
 * AnimatedRevealText / MissionCards (whileInView, once, shared easing).
 * Use it to give otherwise-static blocks (section content, paragraphs)
 * a cohesive "section entrance" without hand-rolling IntersectionObserver.
 * Honors prefers-reduced-motion via Motion's built-in support.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
