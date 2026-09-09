"use client";

import { motion } from "motion/react";

const TRANSITION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] } as const;

/**
 * Hamburger <-> close morph for the mobile nav trigger. Three bars that slide
 * to the centre line and cross into an X, driven by `open`. Replaces an instant
 * <Menu>/<X> swap.
 *
 * Plain positioned <span>s rather than an <svg>, so the rotate transform-origin
 * is the reliable CSS default (element centre) instead of SVG transform-box,
 * which still varies by browser. The global MotionConfig (reducedMotion="user")
 * collapses the tween to instant when the visitor asks for reduced motion, so
 * the icon still flips correctly - it just does not animate.
 */
export function AnimatedMenuIcon({ open, size = 22 }: { open: boolean; size?: number }) {
  const mid = size / 2 - 1; // top of a 2px bar, centred
  const spread = size * 0.28; // rest-state distance of the outer bars from centre
  const bar = "absolute left-[10%] right-[10%] h-[2px] rounded-full bg-current";

  return (
    <span
      className="relative inline-block align-middle"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.span
        className={bar}
        initial={false}
        animate={open ? { top: mid, rotate: 45 } : { top: mid - spread, rotate: 0 }}
        transition={TRANSITION}
      />
      <motion.span
        className={bar}
        style={{ top: mid }}
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={TRANSITION}
      />
      <motion.span
        className={bar}
        initial={false}
        animate={open ? { top: mid, rotate: -45 } : { top: mid + spread, rotate: 0 }}
        transition={TRANSITION}
      />
    </span>
  );
}
