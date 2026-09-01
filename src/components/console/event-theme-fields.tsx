"use client";

import { useState } from "react";

const HEX = /^#[0-9a-fA-F]{6}$/;

type Row = { name: string; label: string; hint: string };

const ROWS: Row[] = [
  { name: "themeBg", label: "Latar halaman", hint: "Warna terang — mis. krem poster. Jadi latar halaman acara (mode terang)." },
  { name: "themeAccent", label: "Aksen utama", hint: "Kartu, garis timeline agenda, chip di hero." },
  { name: "themeAccent2", label: "Aksen kedua", hint: "Kartu samping (tanggal/lokasi/daftar)." },
];

export function EventThemeFields({
  defaults,
}: {
  defaults: { themeBg: string | null; themeAccent: string | null; themeAccent2: string | null };
}) {
  const [vals, setVals] = useState<Record<string, string>>({
    themeBg: defaults.themeBg ?? "",
    themeAccent: defaults.themeAccent ?? "",
    themeAccent2: defaults.themeAccent2 ?? "",
  });

  const set = (name: string, v: string) => setVals((s) => ({ ...s, [name]: v }));
  const allValid = ROWS.every((r) => !vals[r.name] || HEX.test(vals[r.name]));
  const allSet = ROWS.every((r) => HEX.test(vals[r.name]));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-outline-variant p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-label-caps uppercase tracking-wide text-primary-container">Warna Halaman (opsional)</span>
        <p className="text-xs text-on-surface-variant">
          Bikin halaman acara senada dengan poster. Kosongkan ketiganya = pakai tema situs biasa. Tombol daftar
          tetap warna situs (biar kontras aman).
        </p>
      </div>

      {ROWS.map((r) => {
        const v = vals[r.name];
        const valid = !v || HEX.test(v);
        return (
          <label key={r.name} className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{r.label}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={`${r.label} — pemilih warna`}
                value={HEX.test(v) ? v : "#ffffff"}
                onChange={(e) => set(r.name, e.target.value)}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-outline-variant bg-transparent"
              />
              <input
                name={r.name}
                value={v}
                onChange={(e) => set(r.name, e.target.value.trim())}
                placeholder="#RRGGBB — kosongkan untuk pakai tema situs"
                className={`flex-1 rounded-md bg-soft-gray p-2.5 text-body-md ${valid ? "" : "ring-2 ring-error"}`}
              />
            </div>
            <span className="text-xs text-on-surface-variant">{r.hint}</span>
          </label>
        );
      })}

      {!allValid && <p className="text-xs text-error">Format warna harus #RRGGBB (contoh #FFF6E5).</p>}

      {allSet && (
        <div className="flex items-center gap-3 rounded-md border border-outline-variant p-3" style={{ background: vals.themeBg }}>
          <span className="h-8 w-8 rounded-full border border-black/10" style={{ background: vals.themeAccent }} />
          <span className="h-8 w-8 rounded-full border border-black/10" style={{ background: vals.themeAccent2 }} />
          <span className="text-body-sm" style={{ color: "#2b2733" }}>
            Pratinjau kombinasi warna
          </span>
        </div>
      )}
    </div>
  );
}
