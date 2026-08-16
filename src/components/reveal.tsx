"use client";

import { motion } from "motion/react";

/**
 * Scroll-triggered fade-up wrapper, consistent with the project's Motion
 * convention (whileInView + viewport once + shared easing). Honors
 * prefers-reduced-motion automatically via Motion's built-in support.
 * Pass already-rendered server content as children.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
