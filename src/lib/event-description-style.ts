// Katalog font untuk toolbar editor deskripsi acara (EventDescriptionEditor).
// Dipakai server (validasi form) dan client (dropdown toolbar) - satu sumber,
// supaya keduanya tidak bisa berselisih. Semua font di sini sudah di-self-host
// lewat next/font di src/app/layout.tsx (unduhan sekali di build, bukan
// request ke fonts.googleapis.com saat runtime) - penting untuk pembaca dari
// Tiongkok, lihat catatan reachability di docs/Tech Stack.md. Sebuah font cuma
// benar-benar diunduh pengunjung kalau acara yang dia buka memang memakainya.
//
// `cssVar` (bukan `className`) karena TipTap FontFamily menulis inline
// `style="font-family: ..."` per rentang teks yang dipilih, bukan
// class Tailwind di elemen pembungkus - nilainya langsung dipakai sebagai CSS
// var(--font-x), yang sudah dibungkus fallback CJK di globals.css.
const FONT_CATEGORY_LABEL = {
  sans: "Bersih & Modern",
  serif: "Serif & Elegan",
  display: "Tegas & Poster",
  playful: "Playful & Santai",
  handwritten: "Tulisan Tangan",
  mono: "Monospace & Teknis",
} as const;

export const DESCRIPTION_FONT_OPTIONS = [
  { key: "jakarta", category: "sans", label: "Jakarta Sans", hint: "Baku situs", cssVar: "var(--font-sans)" },
  { key: "poppins", category: "sans", label: "Poppins", hint: "Ramah & serbaguna", cssVar: "var(--font-poppins)" },
  { key: "inter", category: "sans", label: "Inter", hint: "Netral, dibuat untuk layar", cssVar: "var(--font-inter)" },
  { key: "manrope", category: "sans", label: "Manrope", hint: "Geometris & lapang", cssVar: "var(--font-manrope)" },
  { key: "spectral", category: "serif", label: "Spectral", hint: "Serif situs, formal", cssVar: "var(--font-serif)" },
  { key: "playfair", category: "serif", label: "Playfair Display", hint: "Kontras tinggi, mewah", cssVar: "var(--font-playfair)" },
  { key: "lora", category: "serif", label: "Lora", hint: "Serif hangat, mudah dibaca", cssVar: "var(--font-lora)" },
  { key: "merriweather", category: "serif", label: "Merriweather", hint: "Serif tebal & mantap", cssVar: "var(--font-merriweather)" },
  { key: "bebas", category: "display", label: "Bebas Neue", hint: "Kondensed, tegas", cssVar: "var(--font-bebas)" },
  { key: "anton", category: "display", label: "Anton", hint: "Super tebal, headline", cssVar: "var(--font-anton)" },
  { key: "oswald", category: "display", label: "Oswald", hint: "Kondensed, modern", cssVar: "var(--font-oswald)" },
  { key: "fredoka", category: "playful", label: "Fredoka", hint: "Bulat & ceria", cssVar: "var(--font-fredoka)" },
  { key: "baloo", category: "playful", label: "Baloo 2", hint: "Bulat, ramah", cssVar: "var(--font-baloo)" },
  { key: "quicksand", category: "playful", label: "Quicksand", hint: "Ringan & bulat", cssVar: "var(--font-quicksand)" },
  { key: "caveat", category: "handwritten", label: "Caveat", hint: "Kesan personal", cssVar: "var(--font-caveat)" },
  { key: "pacifico", category: "handwritten", label: "Pacifico", hint: "Kursif santai", cssVar: "var(--font-pacifico)" },
  { key: "dancing", category: "handwritten", label: "Dancing Script", hint: "Kursif anggun", cssVar: "var(--font-dancing)" },
  { key: "kalam", category: "handwritten", label: "Kalam", hint: "Tulisan tangan santai", cssVar: "var(--font-kalam)" },
  { key: "indieflower", category: "handwritten", label: "Indie Flower", hint: "Bubbly, ceria", cssVar: "var(--font-indieflower)" },
  { key: "permanentmarker", category: "handwritten", label: "Permanent Marker", hint: "Spidol tebal", cssVar: "var(--font-permanentmarker)" },
  { key: "greatvibes", category: "handwritten", label: "Great Vibes", hint: "Kaligrafi mewah", cssVar: "var(--font-greatvibes)" },
  { key: "shadows", category: "handwritten", label: "Shadows Into Light", hint: "Coretan tangan ringan", cssVar: "var(--font-shadows)" },
  { key: "jetbrains", category: "mono", label: "JetBrains Mono", hint: "Teknis, jelas", cssVar: "var(--font-jetbrains)" },
  { key: "spacemono", category: "mono", label: "Space Mono", hint: "Retro-teknis", cssVar: "var(--font-spacemono)" },
  { key: "plexmono", category: "mono", label: "IBM Plex Mono", hint: "Netral, presisi", cssVar: "var(--font-plexmono)" },
] as const;

export const DESCRIPTION_FONT_CATEGORIES = (
  Object.keys(FONT_CATEGORY_LABEL) as (keyof typeof FONT_CATEGORY_LABEL)[]
).map((key) => ({
  key,
  label: FONT_CATEGORY_LABEL[key],
  fonts: DESCRIPTION_FONT_OPTIONS.filter((o) => o.category === key),
}));

// Preset ukuran untuk toolbar (px konkret - dipakai langsung sebagai nilai
// TipTap FontSize, bukan kelas Tailwind, karena berlaku per rentang teks
// terpilih, bukan satu ukuran untuk seluruh blok).
export const DESCRIPTION_SIZE_OPTIONS = [
  { key: "sm", label: "Kecil", px: "14px" },
  { key: "base", label: "Sedang", px: "16px" },
  { key: "lg", label: "Besar", px: "18px" },
  { key: "xl", label: "Ekstra Besar", px: "24px" },
] as const;

export type DescriptionFontKey = (typeof DESCRIPTION_FONT_OPTIONS)[number]["key"];
export type DescriptionSizeKey = (typeof DESCRIPTION_SIZE_OPTIONS)[number]["key"];
