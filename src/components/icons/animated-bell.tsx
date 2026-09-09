"use client";

import { motion } from "motion/react";
import { Bell } from "lucide-react";

/**
 * Notification bell that swings once when `count` first becomes positive and
 * again whenever it grows. Keyed on the (capped) count so a change remounts the
 * span and replays the keyframes from rest - no refs, no effects. When count is
 * 0 it just sits still.
 *
 * Decorative only: the unread badge rendered next to it is the real signal, and
 * MotionConfig flattens the swing for reduced-motion visitors.
 */
export function AnimatedBell({ count, size = 20 }: { count: number; size?: number }) {
  const capped = count > 99 ? 99 : count;
  return (
    <motion.span
      key={capped}
      className="inline-block"
      style={{ transformOrigin: "50% 15%" }}
      initial={{ rotate: 0 }}
      animate={capped > 0 ? { rotate: [0, -14, 11, -7, 4, -2, 0] } : { rotate: 0 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <Bell size={size} />
    </motion.span>
  );
}
