"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { selectInput } from "@/components/console/form";

export type FilterItem = {
  id: string;
  /** Teks yang dicari: nama, nama Mandarin, distrik, dan sejenisnya. */
  text: string;
  /** Nilai kelompok untuk saringan pilihan (mis. kategori). */
  facet?: string | null;
  node: ReactNode;
};

// Daftar pendek tidak butuh pencarian; kotaknya baru muncul saat mulai sulit dipindai mata.
const SEARCH_FROM = 7;

/**
 * Daftar entri katalog dengan pencarian dan satu saringan. Baris yang tidak cocok hanya
 * disembunyikan, tidak dibuang: form edit yang sedang terbuka tidak kehilangan isiannya.
 */
export function FilterList({
  items,
  noun,
  searchPlaceholder,
  facets,
  facetLabel,
  empty,
}: {
  items: FilterItem[];
  /** Kata benda untuk hitungan, mis. "tempat". */
  noun: string;
  searchPlaceholder: string;
  facets?: { value: string; label: string }[];
  facetLabel?: string;
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (item: FilterItem) =>
    (!needle || item.text.toLowerCase().includes(needle)) && (!facet || item.facet === facet);
  const shown = items.filter(matches).length;
  const searchable = items.length >= SEARCH_FROM;

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">{empty}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex h-10 min-w-0 flex-none items-center gap-2 rounded-md bg-soft-gray px-3 focus-within:ring-2 focus-within:ring-primary-container sm:max-w-sm sm:flex-1">
            <Search size={15} className="shrink-0 text-on-surface-variant" aria-hidden />
            <span className="sr-only">{searchPlaceholder}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent py-2 text-body-sm placeholder:text-on-surface-variant focus:outline-none"
            />
          </label>
          {facets && (
            <select
              aria-label={facetLabel}
              value={facet}
              onChange={(e) => setFacet(e.target.value)}
              className={`${selectInput} h-10 text-body-sm`}
            >
              <option value="">{facetLabel}</option>
              {facets.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
          <p aria-live="polite" className="text-body-sm tabular-nums text-on-surface-variant sm:ml-auto">
            {shown === items.length ? `${items.length} ${noun}` : `${shown} dari ${items.length} ${noun}`}
          </p>
        </div>
      )}

      {/* Garis pemisah hanya di antara dua baris yang sama-sama terlihat, supaya saringan tidak menyisakan garis ganda. */}
      <ul
        hidden={shown === 0}
        className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest [&>li:not([hidden])~li:not([hidden])]:border-t [&>li]:border-outline-variant/70"
      >
        {items.map((item) => (
          <li key={item.id} hidden={!matches(item)}>
            {item.node}
          </li>
        ))}
      </ul>

      {shown === 0 && (
        <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">
          Tidak ada {noun} yang cocok. Coba kata lain atau kosongkan saringan.
        </p>
      )}
    </div>
  );
}
