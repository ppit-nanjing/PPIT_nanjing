"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type City = { name: string; hanzi?: string; blurb: string; detail: string; isHq?: boolean };

// Art Deco fan: five rays under an arc. Decoration only.
function Fan({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 42 22" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden="true" focusable="false">
      <path d="M21 21 4 8M21 21 10 3M21 21V1M21 21 32 3M21 21 38 8" />
      <path d="M2 12a22 22 0 0 1 38 0" />
    </svg>
  );
}

// Arch-topped city cards (Nouveau window). The chapter seat is the gold card.
// Tap a card to read more; the card is a button so it works from the keyboard.
//
// Phones: the nine cities sit in a compact 3 x 3 grid of small arches (name +
// hanzi only). There is no room to grow a tile, so the "read more" text opens in
// a full-width panel inserted right under the row of the tapped city. From the
// `sm` breakpoint up the cards are larger and expand in place, as before.
const PHONE_COLS = 3;

export function CitiesGrid({ cities }: { cities: City[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);
  const openIndex = open === null ? -1 : cities.findIndex((c) => c.name === open);
  const openCity = openIndex >= 0 ? cities[openIndex] : null;
  // The phone panel goes after the last tile of the tapped city's row.
  const panelAfter = openIndex >= 0 ? Math.min(cities.length - 1, (Math.floor(openIndex / PHONE_COLS) + 1) * PHONE_COLS - 1) : -1;

  return (
    <motion.div
      className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-5 md:grid-cols-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {cities.map((city, i) => {
        const isOpen = open === city.name;
        return (
          <Fragment key={city.name}>
            <motion.button
              type="button"
              onClick={() => setOpen(isOpen ? null : city.name)}
              aria-expanded={isOpen}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              whileHover={{ y: -4 }}
              className={`arch-top arch-card [--arch-r:3rem] sm:[--arch-r:160px] relative flex flex-col items-center gap-1 sm:gap-2 border px-1 pt-7 pb-3 sm:px-5 sm:pt-12 sm:pb-6 text-center transition-[box-shadow,border-color] motion-reduce:transition-none hover:shadow-[0_14px_36px_rgb(0_0_0/0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                city.isHq
                  ? "hq bg-accent text-on-accent border-accent sm:col-span-2 md:col-span-1"
                  : `bg-surface-container-low text-on-background hover:border-muted-gold ${isOpen ? "border-muted-gold" : "border-outline-variant"}`
              }`}
            >
              <span className={city.isHq ? "text-on-accent" : "text-gold-ink"}>
                <Fan className="h-auto w-7 sm:w-[42px]" />
              </span>
              {city.isHq && <span className="max-sm:sr-only text-label-caps uppercase tracking-[0.2em]">{t("cities.hq")}</span>}
              <h3 className="text-headline-sm max-sm:text-[11.5px] max-sm:leading-tight max-sm:tracking-normal">{city.name}</h3>
              {city.hanzi && (
                <span lang="zh-Hans" className={`text-body-sm max-sm:text-[11px] max-sm:leading-none ${city.isHq ? "text-on-accent" : "text-on-surface-variant"}`}>
                  {city.hanzi}
                </span>
              )}
              <p className={`max-sm:hidden text-body-sm text-pretty ${city.isHq ? "text-on-accent" : "text-on-surface-variant"}`}>{city.blurb}</p>

              <span className={`max-sm:hidden mt-1 flex items-center gap-1 text-label-caps uppercase ${city.isHq ? "text-on-accent" : "text-primary-container"}`}>
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
                    className="overflow-hidden max-sm:hidden"
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

            {/* Phone-only detail panel, full row width, under the tapped city's row. */}
            {openCity && i === panelAfter && (
              <div className="deco-frame col-span-3 rounded-lg bg-surface-container-low p-4 text-left sm:hidden" role="region" aria-label={openCity.name}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-headline-sm text-heading">
                    {openCity.name}
                    {openCity.hanzi && (
                      <span lang="zh-Hans" className="ml-2 text-body-sm text-on-surface-variant">
                        {openCity.hanzi}
                      </span>
                    )}
                    {openCity.isHq && (
                      <span className="ml-2 align-middle text-label-caps uppercase tracking-[0.18em] text-gold-ink">{t("cities.hq")}</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    aria-label={t("cities.close")}
                    className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:text-gold-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="text-body-sm text-on-surface-variant text-pretty">{openCity.blurb}</p>
                <p className="mt-2 border-t border-outline-variant pt-2 text-body-sm text-on-surface-variant text-pretty">{openCity.detail}</p>
              </div>
            )}
          </Fragment>
        );
      })}
    </motion.div>
  );
}
