"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const TABS: { href: string; labelKey: TKey }[] = [
  { href: "/catalogue", labelKey: "catalogue.tabMerch" },
  { href: "/catalogue/donasi", labelKey: "catalogue.tabDonation" },
  { href: "/catalogue/sponsorship", labelKey: "catalogue.tabSponsorship" },
];

export function CatalogueTabs() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t("catalogue.tabsAria")} className="flex flex-wrap gap-2 border-b border-outline-variant">
      {TABS.map((tab) => {
        // Exact match only: /catalogue must not light up on /catalogue/donasi.
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`text-label-caps uppercase tracking-wide px-4 py-3 -mb-px border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              active
                ? "border-primary-container text-on-background"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
