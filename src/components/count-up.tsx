"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "motion/react";

/**
 * Count-up animation for the home page stats. Parses a leading integer from a
 * value like "66" and animates 0 -> target when scrolled into view, keeping any
 * non-numeric suffix (e.g. "+"). Honors prefers-reduced-motion because Motion's
 * `animate` respects it.
 *
 * The initial render (server and first client render alike) shows the REAL
 * number, not "0" - the figure is a fact the page states, and it must survive a
 * crawl or a slow/failed hydration. When the element scrolls into view JS resets
 * it to 0 and counts up as an enhancement.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : value;

  const [display, setDisplay] = useState(match ? match[1] : value);

  useEffect(() => {
    if (!inView || target === 0) return;
    const controls = animate(0, target, {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, target]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
