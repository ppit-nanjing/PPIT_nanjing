"use client";

import { motion } from "motion/react";
import { MapPin, Building2, CalendarDays } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// lucide icon components are functions and can't cross the RSC boundary as
// props, so the icon set is named here and resolved by key.
const ICONS = { MapPin, Building2, CalendarDays };

// Every figure here is one the organisation can stand behind: the city and
// campus counts come straight from the database (see src/app/page.tsx), 2008 is
// the founding year. No estimated headcount - member_count is not collected per
// city, so a "N+ students" stat here would be invented.
export function StatsGrid({ cityCount, campusCount }: { cityCount: number; campusCount: number }) {
  const t = useT();
  const stats: { icon: keyof typeof ICONS; value: string; labelKey: TKey }[] = [
    { icon: "MapPin", value: String(cityCount), labelKey: "stats.coveredCities" },
    { icon: "Building2", value: String(campusCount), labelKey: "stats.campuses" },
    { icon: "CalendarDays", value: "2008", labelKey: "stats.estSince" },
  ];

  return (
    <motion.section
      className="grid grid-cols-1 md:grid-cols-3 gap-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {stats.map(({ icon, value, labelKey }) => {
        const Icon = ICONS[icon];
        return (
          <motion.div
            key={labelKey}
            variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-surface-container-low rounded-xl p-10 flex flex-col items-center text-center border border-outline-variant"
          >
            <Icon className="text-primary-container mb-4" size={36} aria-hidden="true" />
            <CountUp value={value} className="text-display-hero-mobile text-on-background mb-2" />
            <p className="text-label-caps text-on-surface-variant uppercase tracking-widest">{t(labelKey)}</p>
          </motion.div>
        );
      })}
    </motion.section>
  );
}
