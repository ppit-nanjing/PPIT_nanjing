"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * Thin reading-progress bar pinned to the top of an article. Uses Motion's
 * useScroll on the whole page and a spring for a smooth, natural feel.
 * Purely decorative - hidden from assistive tech.
 */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-1 bg-primary-container origin-left z-[60]"
    />
  );
}
