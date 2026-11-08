"use client";

import { useId, useState } from "react";
import { fieldInput } from "@/components/console/form";
import { renderMarkdownLite } from "@/lib/markdown-lite";

type Props = {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string | null;
  rows?: number;
};

/**
 * Isi artikel: textarea plus tab pratinjau. Pratinjaunya memakai renderer yang
 * sama dengan halaman publik (src/lib/markdown-lite.tsx), jadi yang dilihat
 * pengurus di sini sama dengan yang dibaca maba - bukan renderer kedua yang
 * bisa menyimpang.
 */
export function MarkdownEditor({ name, label, hint, defaultValue, rows = 12 }: Props) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
        <label htmlFor={id}>{label}</label>
      </span>
      <div role="tablist" aria-label="Mode penyuntingan" className="flex flex-wrap items-center gap-1">
        {(
          [
            ["write", "Tulis"],
            ["preview", "Pratinjau"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`px-3 py-1.5 rounded-md text-label-caps uppercase tracking-wide transition-colors ${
              mode === key
                ? "bg-primary-container/10 text-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {text}
          </button>
        ))}
        <span className="ml-auto text-xs text-on-surface-variant">
          {value.length.toLocaleString("id-ID")} karakter
        </span>
      </div>

      {mode === "write" ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          className={`${fieldInput} resize-y font-mono text-sm`}
        />
      ) : (
        <>
          {/* Textarea-nya tidak dirender di mode pratinjau, jadi isinya harus
              ikut terkirim lewat hidden input - kalau tidak, menyimpan saat
              pratinjau terbuka mengosongkan artikelnya. */}
          <input type="hidden" name={name} value={value} />
          <div
            role="tabpanel"
            className="bg-soft-gray rounded-md px-4 py-3 min-h-[6rem] max-h-[32rem] overflow-auto"
          >
            {value.trim() ? (
              renderMarkdownLite(value)
            ) : (
              <p className="text-body-md text-on-surface-variant">Belum ada isi.</p>
            )}
          </div>
        </>
      )}
      {hint && <span className="text-xs text-on-surface-variant">{hint}</span>}
    </div>
  );
}
