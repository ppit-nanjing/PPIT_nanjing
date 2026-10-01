"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/count-up";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Every figure here is one the organisation can stand behind: the city and
// campus counts come straight from the database (see src/app/page.tsx), 2008 is
// the founding year. No estimated headcount - member_count is not collected per
// city, so a "N+ students" stat here would be invented.
export function StatsGrid({ cityCount, campusCount }: { cityCount: number; campusCount: number }) {
  const t = useT();
  const stats: { value: string; labelKey: TKey }[] = [
    { value: String(cityCount), labelKey: "stats.coveredCities" },
    { value: String(campusCount), labelKey: "stats.campuses" },
    { value: "2008", labelKey: "stats.estSince" },
  ];

  return (
    <motion.section
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {stats.map(({ value, labelKey }) => (
        <motion.div
          key={labelKey}
          variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="deco-frame bg-surface-container rounded-md px-6 py-9 flex flex-col items-center text-center"
        >
          <span className="medal-ring mb-5">
            <CountUp value={value} className="text-headline-lg text-on-background" />
          </span>
          <p className="text-label-caps text-gold-ink uppercase tracking-[0.26em]">{t(labelKey)}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}
