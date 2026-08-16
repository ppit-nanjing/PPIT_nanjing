"use client";

import { motion } from "motion/react";
import { Users, GraduationCap, CalendarDays } from "lucide-react";
import { CountUp } from "@/components/count-up";

// Owned here (not passed from the server page) because lucide icon components
// are functions and can't cross the RSC boundary as props.
const STATS = [
  { icon: Users, value: "600+", label: "Pelajar Aktif" },
  { icon: GraduationCap, value: "6", label: "Kota Naungan" },
  { icon: CalendarDays, value: "2008", label: "Berdiri Sejak" },
];

export function StatsGrid() {
  return (
    <motion.section
      className="grid grid-cols-1 md:grid-cols-3 gap-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {STATS.map(({ icon: Icon, value, label }) => (
        <motion.div
          key={label}
          variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -6 }}
          className="bg-surface-container-low rounded-lg p-10 flex flex-col items-center text-center border border-outline-variant"
        >
          <Icon className="text-primary-container mb-4" size={40} strokeWidth={1.5} />
          <CountUp value={value} className="text-display-hero-mobile text-on-background mb-2" />
          <p className="text-label-caps text-on-surface-variant uppercase tracking-widest">{label}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}
