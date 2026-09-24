// Satu sumber untuk pilihan typography kartu deskripsi acara publik - dipakai
// baik oleh picker di console (client) maupun render halaman acara (server),
// supaya keduanya tidak bisa berselisih dan server action bisa menolak nilai
// di luar daftar ini. Semua font di sini sudah di-self-host lewat next/font
// di src/app/layout.tsx (unduhan sekali di build, bukan request ke
// fonts.googleapis.com saat runtime) - penting untuk pembaca dari Tiongkok,
// lihat catatan reachability di docs/Tech Stack.md. Sebuah font di sini cuma
// benar-benar diunduh pengunjung kalau acara yang dia buka memang memakainya
// (CSS scoped per next/font) - jadi daftar boleh panjang, dikelompokkan per
// kategori supaya tetap gampang dipilih di picker (bukan satu dropdown datar).
// Flat list first (not derived from the grouped view) - a flatMap() over
// nested `as const` category tuples of DIFFERENT shapes made TypeScript give
// up on literal inference entirely (every key widened to `unknown`). Keeping
// one single `as const` array here, then deriving the grouped view below via
// a plain .filter() (which preserves the element type fine, unlike flatMap
// across heterogeneous tuples), avoided that.
const FONT_CATEGORY_LABEL = {
  sans: "Bersih & Modern",
  serif: "Serif & Elegan",
  display: "Tegas & Poster",
  playful: "Playful & Santai",
  handwritten: "Tulisan Tangan",
  mono: "Monospace & Teknis",
} as const;

export const DESCRIPTION_FONT_OPTIONS = [
  { key: "jakarta", category: "sans", label: "Jakarta Sans", hint: "Baku situs", className: "font-sans" },
  { key: "poppins", category: "sans", label: "Poppins", hint: "Ramah & serbaguna", className: "font-poppins" },
  { key: "inter", category: "sans", label: "Inter", hint: "Netral, dibuat untuk layar", className: "font-inter" },
  { key: "manrope", category: "sans", label: "Manrope", hint: "Geometris & lapang", className: "font-manrope" },
  { key: "spectral", category: "serif", label: "Spectral", hint: "Serif situs, formal", className: "font-serif" },
  { key: "playfair", category: "serif", label: "Playfair Display", hint: "Kontras tinggi, mewah", className: "font-playfair" },
  { key: "lora", category: "serif", label: "Lora", hint: "Serif hangat, mudah dibaca", className: "font-lora" },
  { key: "merriweather", category: "serif", label: "Merriweather", hint: "Serif tebal & mantap", className: "font-merriweather" },
  { key: "bebas", category: "display", label: "Bebas Neue", hint: "Kondensed, tegas", className: "font-bebas" },
  { key: "anton", category: "display", label: "Anton", hint: "Super tebal, headline", className: "font-anton" },
  { key: "oswald", category: "display", label: "Oswald", hint: "Kondensed, modern", className: "font-oswald" },
  { key: "fredoka", category: "playful", label: "Fredoka", hint: "Bulat & ceria", className: "font-fredoka" },
  { key: "baloo", category: "playful", label: "Baloo 2", hint: "Bulat, ramah", className: "font-baloo" },
  { key: "quicksand", category: "playful", label: "Quicksand", hint: "Ringan & bulat", className: "font-quicksand" },
  { key: "caveat", category: "handwritten", label: "Caveat", hint: "Kesan personal", className: "font-caveat" },
  { key: "pacifico", category: "handwritten", label: "Pacifico", hint: "Kursif santai", className: "font-pacifico" },
  { key: "dancing", category: "handwritten", label: "Dancing Script", hint: "Kursif anggun", className: "font-dancing" },
  { key: "kalam", category: "handwritten", label: "Kalam", hint: "Tulisan tangan santai", className: "font-kalam" },
  { key: "indieflower", category: "handwritten", label: "Indie Flower", hint: "Bubbly, ceria", className: "font-indieflower" },
  { key: "permanentmarker", category: "handwritten", label: "Permanent Marker", hint: "Spidol tebal", className: "font-permanentmarker" },
  { key: "greatvibes", category: "handwritten", label: "Great Vibes", hint: "Kaligrafi mewah", className: "font-greatvibes" },
  { key: "shadows", category: "handwritten", label: "Shadows Into Light", hint: "Coretan tangan ringan", className: "font-shadows" },
  { key: "jetbrains", category: "mono", label: "JetBrains Mono", hint: "Teknis, jelas", className: "font-jetbrains" },
  { key: "spacemono", category: "mono", label: "Space Mono", hint: "Retro-teknis", className: "font-spacemono" },
  { key: "plexmono", category: "mono", label: "IBM Plex Mono", hint: "Netral, presisi", className: "font-plexmono" },
] as const;

export const DESCRIPTION_FONT_CATEGORIES = (
  Object.keys(FONT_CATEGORY_LABEL) as (keyof typeof FONT_CATEGORY_LABEL)[]
).map((key) => ({
  key,
  label: FONT_CATEGORY_LABEL[key],
  fonts: DESCRIPTION_FONT_OPTIONS.filter((o) => o.category === key),
}));

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
