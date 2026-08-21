"use client";

import { motion } from "motion/react";
import { Users, Layers, Handshake } from "lucide-react";
import { useT } from "@/lib/i18n/client";

// Owned here, not passed in from the server page: lucide icon components are
// functions, and Next.js's RSC boundary can't serialize functions/classes as
// props from a Server Component into a Client Component like this one.
const ICONS = { Users, Layers, Handshake };
const MISI = [
  { icon: "Users", textKey: "mission.1" },
  { icon: "Layers", textKey: "mission.2" },
  { icon: "Handshake", textKey: "mission.3" },
] as const;

/**
 * About page's Misi cards: scroll-triggered stagger reveal + hover lift,
 * same Motion family (whileInView, viewport once, shared easing curve) as
 * AnimatedRevealText/AnimatedLettersHeading elsewhere in this project, just
 * applied to a card grid instead of text. The top accent bar and numbered
 * index turn three near-identical cards into a readable sequence instead of
 * a flat, undifferentiated row.
 */
export function MissionCards() {
  const t = useT();
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    >
      {MISI.map(({ icon, textKey }, i) => {
        const Icon = ICONS[icon];
        return (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 24 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          whileHover={{ y: -6 }}
          className="group relative bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col gap-4 overflow-hidden transition-colors hover:border-primary-container"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-primary-container origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
          />
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-full bg-primary-container/10 flex items-center justify-center transition-colors group-hover:bg-primary-container/20">
              <Icon className="text-primary-container" size={22} />
            </div>
            <span className="text-label-caps text-on-surface-variant/40" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant">{t(textKey)}</p>
        </motion.div>
        );
      })}
    </motion.div>
  );
}
