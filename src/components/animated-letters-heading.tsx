"use client";

import { motion } from "motion/react";

/**
 * Letter-by-letter rise-in reveal for a short heading, triggered on scroll
 * into view. Ported from the Footer reference's SplitText component - same
 * visual idea (each letter fades + slides up with a per-letter stagger delay)
 * but built on `motion`'s whileInView instead of a hand-rolled
 * IntersectionObserver + CSS transition-delay per span, matching how the
 * rest of this project's word/letter reveals are built (AnimatedHeroHeading,
 * AnimatedRevealText).
 */
export function AnimatedLettersHeading({
  text,
  className,
  as = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  const words = text.split(" ");
  const MotionTag = as === "h1" ? motion.h1 : motion.h2;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={{ visible: { transition: { staggerChildren: 0.02 } } }}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap mr-[0.25em]" aria-hidden="true">
          {word.split("").map((letter, li) => (
            <motion.span
              key={li}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </span>
      ))}
    </MotionTag>
  );
}
