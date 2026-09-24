"use client";

import { useState, type ReactNode } from "react";
import { AIImproveButton } from "@/components/ai/ai-improve-button";
import {
  DESCRIPTION_FONT_CATEGORIES,
  DESCRIPTION_FONT_OPTIONS,
  DESCRIPTION_SIZE_OPTIONS,
  DESCRIPTION_WEIGHT_OPTIONS,
  DEFAULT_DESCRIPTION_FONT,
  DEFAULT_DESCRIPTION_SIZE,
  DEFAULT_DESCRIPTION_WEIGHT,
  type DescriptionFontKey,
  type DescriptionSizeKey,
  type DescriptionWeightKey,
} from "@/lib/event-description-style";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? "border-primary-container bg-primary-container/10"
          : "border-outline-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

// "Gaya Teks Deskripsi" — pilihan font/ukuran/ketebalan yang berlaku untuk
// SELURUH deskripsi sekaligus (bukan rich text per-kata, lihat pilihan yang
// disepakati di src/lib/event-description-style.ts). Textarea deskripsi
// dipindah ke sini (dari raw <textarea> di halaman) supaya pratinjau di bawah
// bisa ikut nge-live-update sambil diketik — bukan cuma waktu ganti font.
export function EventDescriptionStyleFields({
  defaults,
}: {
  defaults: {
    description: string;
    descriptionFont: string | null;
    descriptionFontSize: string | null;
    descriptionFontWeight: string | null;
  };
}) {
  const [description, setDescription] = useState(defaults.description);
  const [font, setFont] = useState<DescriptionFontKey>(
    (DESCRIPTION_FONT_OPTIONS.find((o) => o.key === defaults.descriptionFont)?.key as DescriptionFontKey | undefined) ??
      DEFAULT_DESCRIPTION_FONT,
  );
  const [size, setSize] = useState<DescriptionSizeKey>(
    (DESCRIPTION_SIZE_OPTIONS.find((o) => o.key === defaults.descriptionFontSize)?.key as
      | DescriptionSizeKey
      | undefined) ?? DEFAULT_DESCRIPTION_SIZE,
  );
  const [weight, setWeight] = useState<DescriptionWeightKey>(
    (DESCRIPTION_WEIGHT_OPTIONS.find((o) => o.key === defaults.descriptionFontWeight)?.key as
      | DescriptionWeightKey
      | undefined) ?? DEFAULT_DESCRIPTION_WEIGHT,
  );

  const fontClass = DESCRIPTION_FONT_OPTIONS.find((o) => o.key === font)!.className;
  const sizeClass = DESCRIPTION_SIZE_OPTIONS.find((o) => o.key === size)!.className;
  const weightClass = DESCRIPTION_WEIGHT_OPTIONS.find((o) => o.key === weight)!.className;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <textarea
          id="event-description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-soft-gray rounded-md p-3 text-body-md resize-none w-full"
        />
        <AIImproveButton context="event" targetId="event-description" className="mt-1" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-outline-variant p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-label-caps uppercase tracking-wide text-primary-container">
            Gaya Teks Deskripsi (opsional)
          </span>
          <p className="text-xs text-on-surface-variant">
            Samakan nuansa deskripsi dengan poster acara. Biarkan di pilihan baku untuk tampilan standar situs.
          </p>
        </div>

        {/* Chip, bukan <select> native — supaya tiap font kelihatan bentuknya
            sendiri langsung di pemilihnya, bukan cuma nama polos di dropdown. */}
        <input type="hidden" name="descriptionFont" value={font} />
        <input type="hidden" name="descriptionFontSize" value={size} />
        <input type="hidden" name="descriptionFontWeight" value={weight} />

        <div className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Font</span>
          {/* Dibatasi tinggi + scroll internal (bukan dorong seluruh form ke
              bawah) - pola sama dengan daftar panjang lain di console, lihat
              CollapsibleRecordList. 20 font terlalu banyak buat digelar datar. */}
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto rounded-md border border-outline-variant p-3">
            {DESCRIPTION_FONT_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-on-surface-variant">{cat.label}</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {cat.fonts.map((o) => (
                    <Chip key={o.key} active={font === o.key} onClick={() => setFont(o.key)}>
                      <span className={`block text-body-md text-on-background ${o.className}`}>{o.label}</span>
                      <span className="block text-xs text-on-surface-variant">{o.hint}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Ukuran</span>
          <div className="flex flex-wrap gap-2">
            {DESCRIPTION_SIZE_OPTIONS.map((o) => (
              <Chip key={o.key} active={size === o.key} onClick={() => setSize(o.key)}>
                <span className="flex items-center gap-2 text-on-background">
                  <span className={o.className}>Aa</span>
                  <span className="text-xs text-on-surface-variant">{o.label}</span>
                </span>
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Ketebalan</span>
          <div className="flex flex-wrap gap-2">
            {DESCRIPTION_WEIGHT_OPTIONS.map((o) => (
              <Chip key={o.key} active={weight === o.key} onClick={() => setWeight(o.key)}>
                <span className={`text-body-md text-on-background ${o.className}`}>{o.label}</span>
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Pratinjau</span>
          {/* Kelas identik dengan kartu deskripsi di halaman acara publik
              (events/[slug]/page.tsx) - ini bukan sekadar contoh, tapi persis
              apa yang bakal dilihat pengunjung. */}
          <div className="rounded-lg border border-outline-variant bg-surface-container-lowest/70 p-6">
            <p className={`whitespace-pre-wrap leading-relaxed text-on-surface-variant ${fontClass} ${sizeClass} ${weightClass}`}>
              {description || "Tulis deskripsi di atas untuk melihat pratinjaunya di sini."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
