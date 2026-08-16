"use client";

import { motion } from "motion/react";

export function CitiesGrid({ cities }: { cities: string[] }) {
  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {cities.map((city) => (
        <motion.div
          key={city}
          variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ scale: 1.04 }}
          className="bg-surface-container-low border border-outline-variant rounded-md px-6 py-5 text-center text-body-md font-medium hover:bg-primary-container/10 transition-colors"
        >
          {city}
        </motion.div>
      ))}
    </motion.div>
  );
}
