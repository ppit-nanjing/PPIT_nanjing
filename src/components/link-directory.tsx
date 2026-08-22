"use client";

import { useMemo, useState } from "react";

type LinkItem = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  periodLabel: string;
};

export function LinkDirectory({
  links,
  periods,
  categoryLabels,
}: {
  links: LinkItem[];
  periods: { id: string; label: string }[];
  categoryLabels: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (period !== "all" && l.periodLabel !== period) return false;
      if (q && !(`${l.title} ${l.description}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [links, query, category, period]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1.5 flex-1">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Cari</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="judul atau deskripsi..."
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 text-body-md"
          >
            <option value="all">Semua</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Periode</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 text-body-md"
          >
            <option value="all">Semua</option>
            {periods.map((p) => (
              <option key={p.id} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">Tidak ada tautan yang cocok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((l) => (
            <li
              key={l.slug}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <a href={`/l/${l.slug}`} className="font-medium text-primary-container hover:text-primary text-body-lg">
                  {l.title}
                </a>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-label-caps bg-primary-container/30 text-on-primary-container">
                  {l.categoryLabel}
                </span>
              </div>
              {l.description && <p className="text-body-md text-on-surface-variant">{l.description}</p>}
              <div className="flex items-center justify-between gap-3">
                <span className="text-label-caps text-on-surface-variant/80">Periode: {l.periodLabel}</span>
                <a
                  href={`/l/${l.slug}`}
                  className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
                >
                  Buka →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
