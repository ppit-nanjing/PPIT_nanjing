"use client";

import { motion } from "motion/react";
import { MapPin } from "lucide-react";

export function CitiesGrid({ cities }: { cities: { name: string; blurb: string }[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {cities.map((city) => (
        <motion.div
          key={city.name}
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -4 }}
          className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-2 hover:border-primary-container transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="text-primary-container shrink-0" size={18} />
            <h3 className="text-headline-sm text-on-background">{city.name}</h3>
          </div>
          <p className="text-body-sm text-on-surface-variant">{city.blurb}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
