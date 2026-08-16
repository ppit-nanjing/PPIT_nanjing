"use client";

import Link from "next/link";
import { motion } from "motion/react";

/**
 * Animated category/year filter. The active option carries a sliding
 * "pill" (shared layoutId) that glides between options - a small but
 * tactile interaction that makes filtering feel responsive without a
 * full page reload (Link does a soft client navigation; scroll:false
 * keeps the viewport in place). Honors prefers-reduced-motion via Motion.
 */
export function FilterTabs({
  options,
  layoutId = "filter-pill",
  className = "",
}: {
  options: { key: string; label: string; href: string; active: boolean }[];
  layoutId?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "true" : undefined}
          className={`relative px-5 py-2.5 rounded-lg text-label-caps uppercase tracking-wide transition-colors ${
            o.active
              ? "text-on-primary"
              : "text-on-background hover:bg-surface-container-low"
          }`}
        >
          {o.active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-primary-container rounded-lg -z-10"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          {o.label}
        </Link>
      ))}
    </div>
  );
}
