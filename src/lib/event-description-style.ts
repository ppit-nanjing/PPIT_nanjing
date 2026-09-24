// Satu sumber untuk pilihan typography kartu deskripsi acara publik - dipakai
// baik oleh picker di console (client) maupun render halaman acara (server),
// supaya keduanya tidak bisa berselisih dan server action bisa menolak nilai
// di luar daftar ini. Semua font di sini sudah di-self-host lewat next/font
// di src/app/layout.tsx (unduhan sekali di build, bukan request ke
// fonts.googleapis.com saat runtime) - penting untuk pembaca dari Tiongkok,
// lihat catatan reachability di docs/Tech Stack.md. Sengaja daftar pendek:
// nambah font baru berarti nambah berkas font yang mungkin diunduh pengunjung.
export const DESCRIPTION_FONT_OPTIONS = [
  { key: "jakarta", label: "Jakarta Sans", hint: "Baku situs - netral & mudah dibaca", className: "font-sans" },
  { key: "spectral", label: "Spectral", hint: "Serif situs - elegan & formal", className: "font-serif" },
  { key: "poppins", label: "Poppins", hint: "Modern & ramah", className: "font-poppins" },
  { key: "fredoka", label: "Fredoka", hint: "Playful & bulat - cocok acara santai", className: "font-fredoka" },
  { key: "bebas", label: "Bebas Neue", hint: "Tegas & besar - cocok pengumuman", className: "font-bebas" },
  { key: "caveat", label: "Caveat", hint: "Tulisan tangan - kesan personal", className: "font-caveat" },
] as const;

// text-quote-text (bukan salah satu token "headline") sengaja dipakai untuk
// "xl" - token headline di globals.css membawa font-weight bawaannya sendiri
// (mis. --text-headline-sm--font-weight: 700), yang akan tabrakan dengan
// pemilih ketebalan di bawah. quote-text cuma soal ukuran, netral di berat.
export const DESCRIPTION_SIZE_OPTIONS = [
  { key: "sm", label: "Kecil", className: "text-body-sm" },
  { key: "base", label: "Sedang", className: "text-body-md" },
  { key: "lg", label: "Besar", className: "text-body-lg" },
  { key: "xl", label: "Ekstra Besar", className: "text-quote-text" },
] as const;

export const DESCRIPTION_WEIGHT_OPTIONS = [
  { key: "normal", label: "Reguler", className: "font-normal" },
  { key: "medium", label: "Sedang", className: "font-medium" },
  { key: "bold", label: "Tebal", className: "font-bold" },
] as const;

export type DescriptionFontKey = (typeof DESCRIPTION_FONT_OPTIONS)[number]["key"];
export type DescriptionSizeKey = (typeof DESCRIPTION_SIZE_OPTIONS)[number]["key"];
export type DescriptionWeightKey = (typeof DESCRIPTION_WEIGHT_OPTIONS)[number]["key"];

export const DEFAULT_DESCRIPTION_FONT: DescriptionFontKey = "jakarta";
export const DEFAULT_DESCRIPTION_SIZE: DescriptionSizeKey = "lg";
export const DEFAULT_DESCRIPTION_WEIGHT: DescriptionWeightKey = "normal";

function classFor<T extends { key: string; className: string }>(
  options: readonly T[],
  key: string | null | undefined,
  fallback: string,
): string {
  return options.find((o) => o.key === key)?.className ?? fallback;
}

/** Kelas Tailwind gabungan untuk merender deskripsi acara sesuai pilihan tersimpan. */
export function descriptionStyleClassName(style: {
  descriptionFont: string | null;
  descriptionFontSize: string | null;
  descriptionFontWeight: string | null;
}): string {
  const font = classFor(
    DESCRIPTION_FONT_OPTIONS,
    style.descriptionFont,
    DESCRIPTION_FONT_OPTIONS.find((o) => o.key === DEFAULT_DESCRIPTION_FONT)!.className,
  );
  const size = classFor(
    DESCRIPTION_SIZE_OPTIONS,
    style.descriptionFontSize,
    DESCRIPTION_SIZE_OPTIONS.find((o) => o.key === DEFAULT_DESCRIPTION_SIZE)!.className,
  );
  const weight = classFor(
    DESCRIPTION_WEIGHT_OPTIONS,
    style.descriptionFontWeight,
    DESCRIPTION_WEIGHT_OPTIONS.find((o) => o.key === DEFAULT_DESCRIPTION_WEIGHT)!.className,
  );
  return `${font} ${size} ${weight}`;
}

/** Validasi nilai form sebelum disimpan - null kalau tidak dikenali (jatuh ke baku). */
export function normalizeDescriptionStyleValue<T extends string>(
  options: readonly { key: T }[],
  raw: FormDataEntryValue | null,
): T | null {
  const value = String(raw ?? "").trim();
  return (options.find((o) => o.key === value)?.key as T | undefined) ?? null;
}
