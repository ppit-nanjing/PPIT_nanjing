"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, ChevronDown } from "lucide-react";

export function CitiesGrid({ cities }: { cities: { name: string; blurb: string; detail: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {cities.map((city) => {
        const isOpen = open === city.name;
        return (
          <motion.button
            key={city.name}
            type="button"
            onClick={() => setOpen(isOpen ? null : city.name)}
            aria-expanded={isOpen}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ y: -4 }}
            className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-3 hover:border-primary-container hover:shadow-[0_10px_30px_rgba(39,23,22,0.05)] transition-all text-left"
          >
            <div className="flex items-start gap-2">
              <MapPin className="text-primary-container shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h3 className="text-headline-sm text-on-background">{city.name}</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">{city.blurb}</p>
              </div>
            </div>

            <span
              className="self-start flex items-center gap-1 text-label-caps text-primary-container"
            >
              {isOpen ? "Tutup" : "Baca selengkapnya"}
              <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </span>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-body-sm text-on-surface-variant border-t border-outline-variant pt-3">
                    {city.detail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
