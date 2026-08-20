"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/catalogue", label: "Merchandise" },
  { href: "/catalogue/donasi", label: "Donasi" },
  { href: "/catalogue/sponsorship", label: "Sponsorship" },
];

export function CatalogueTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Bagian katalog" className="flex flex-wrap gap-2 border-b border-outline-variant">
      {TABS.map((t) => {
        // Exact match only: /catalogue must not light up on /catalogue/donasi.
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`text-label-caps uppercase tracking-wide px-4 py-3 -mb-px border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              active
                ? "border-primary-container text-on-background"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
