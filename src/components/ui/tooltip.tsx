"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

type Props = {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

/**
 * Minimal hover/focus tooltip - shows `label` near `children` on hover or
 * keyboard focus. Touch devices have no hover state, so icon-only controls
 * this wraps should still carry their own aria-label - the tooltip is a
 * sighted-mouse-user convenience on top of that, not a replacement for it.
 * Same Motion fade/scale family as the scroll-reveal components elsewhere in
 * this project (AnimatedRevealText, AnimatedLettersHeading), just
 * trigger-driven instead of viewport-driven.
 */
export function Tooltip({ label, children, side = "bottom" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            id={id}
            initial={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "bottom" ? -4 : 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className={`absolute left-1/2 -translate-x-1/2 ${
              side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
            } whitespace-nowrap bg-on-background text-background text-label-caps px-2.5 py-1.5 rounded-md shadow-lg z-[60] pointer-events-none`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
