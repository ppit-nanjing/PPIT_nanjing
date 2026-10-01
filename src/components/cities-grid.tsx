"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type City = { name: string; hanzi?: string; blurb: string; detail: string; isHq?: boolean };

// Art Deco fan: five rays under an arc. Decoration only.
function Fan() {
  return (
    <svg viewBox="0 0 42 22" width="42" height="22" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M21 21 4 8M21 21 10 3M21 21V1M21 21 32 3M21 21 38 8" />
      <path d="M2 12a22 22 0 0 1 38 0" />
    </svg>
  );
}

// Arch-topped city cards (Nouveau window). The chapter seat is the gold card.
// Tap a card to read more; the card is a button so it works from the keyboard.
export function CitiesGrid({ cities }: { cities: City[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
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
            className={`arch-top arch-card relative flex flex-col items-center gap-2 border px-5 pt-12 pb-6 text-center transition-[box-shadow,border-color] motion-reduce:transition-none hover:shadow-[0_14px_36px_rgb(0_0_0/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              city.isHq
                ? "hq bg-accent text-on-accent border-accent sm:col-span-2 md:col-span-1"
                : "bg-surface-container-low text-on-background border-outline-variant hover:border-muted-gold"
            }`}
          >
            <span className={city.isHq ? "text-on-accent" : "text-gold-ink"}>
              <Fan />
            </span>
            {city.isHq && <span className="text-label-caps uppercase tracking-[0.2em]">{t("cities.hq")}</span>}
            <h3 className="text-headline-sm">{city.name}</h3>
            {city.hanzi && (
              <span lang="zh-Hans" className={`text-body-sm ${city.isHq ? "text-on-accent" : "text-on-surface-variant"}`}>
                {city.hanzi}
              </span>
            )}
            <p className={`text-body-sm text-pretty ${city.isHq ? "text-on-accent" : "text-on-surface-variant"}`}>{city.blurb}</p>

            <span className={`mt-1 flex items-center gap-1 text-label-caps uppercase ${city.isHq ? "text-on-accent" : "text-primary-container"}`}>
              {isOpen ? t("cities.close") : t("cities.readMore")}
              <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
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
                  <p
                    className={`text-body-sm text-pretty border-t pt-3 mt-1 ${
                      city.isHq ? "text-on-accent border-on-accent/30" : "text-on-surface-variant border-outline-variant"
                    }`}
                  >
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
