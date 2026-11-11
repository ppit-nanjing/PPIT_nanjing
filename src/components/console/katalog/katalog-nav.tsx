"use client";

import Link from "next/link";

export type KatalogNavTab = { key: string; label: string; count: string; attention: boolean; current: boolean; dividerBefore: boolean };

/**
 * Baris tab katalog. Komponen klien hanya demi satu hal: di layar sempit barisnya bergulir
 * ke samping, dan tab yang aktif harus ikut tergulir ke dalam layar setelah halaman dimuat.
 */
export function KatalogNav({ tabs }: { tabs: KatalogNavTab[] }) {
  return (
    <nav aria-label="Bagian katalog" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-outline-variant">
      {tabs.map((tab) => (
        <span key={tab.key} className="flex shrink-0 items-stretch">
          {/* Garis tipis memisahkan kelompok kota dari kelompok katalog. */}
          {tab.dividerBefore && <span aria-hidden className="mx-3 my-2.5 w-px bg-outline-variant" />}
          <Link
            href={`/console/katalog?tab=${tab.key}`}
            aria-current={tab.current ? "page" : undefined}
            ref={tab.current ? (el) => el?.scrollIntoView({ inline: "nearest", block: "nearest" }) : undefined}
            className={`border-b-2 px-3.5 py-2.5 text-label-caps uppercase tracking-wide transition-colors motion-reduce:transition-none ${
              tab.current
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {tab.label} <span className={`tabular-nums ${tab.attention ? "text-gold-ink" : ""}`}>{tab.count}</span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
