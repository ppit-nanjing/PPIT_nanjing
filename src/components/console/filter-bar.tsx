"use client";

import { Search } from "lucide-react";

// Bilah saring konsol: tab-chip bergaris bawah berisi jumlah + kotak cari di kanan
// (papan Kegiatan, antrean peminjaman, daftar barang).
export function FilterBar<K extends string>({
  label,
  options,
  value,
  onChange,
  query,
  onQuery,
  placeholder,
}: {
  label: string;
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (key: K) => void;
  query: string;
  onQuery: (query: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6 xl:border-b xl:border-outline-variant">
      <div
        role="group"
        aria-label={label}
        className="flex min-w-0 gap-1 overflow-x-auto overflow-y-hidden border-b border-outline-variant xl:border-b-0"
      >
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={value === option.key}
            onClick={() => onChange(option.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors ${
              value === option.key
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {option.label}
            {option.count != null && <span className="tabular-nums"> {option.count}</span>}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 rounded-md bg-soft-gray px-3 xl:w-72 xl:shrink-0">
        <Search size={15} className="shrink-0 text-on-surface-variant" aria-hidden />
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-2 text-body-sm placeholder:text-on-surface-variant focus:outline-none"
        />
      </label>
    </div>
  );
}
