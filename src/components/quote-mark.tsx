"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";

export function QuoteMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="mb-6"
    >
      <Quote className="text-primary-container" size={40} />
    </motion.div>
  );
}
