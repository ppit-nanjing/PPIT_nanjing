# Spacing System

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Direkonstruksi dari token semantik di kedua `DESIGN.md` + `tailwind.config.spacing` yang benar-benar di-generate di file `code.html` (dicek di `ppit_nanjing_homepage_final_refinement`, yang match 1:1 dengan skala Warm Institutional).

## Unit dasar

Base unit **4px (0.25rem)**, disiplin kelipatan 4 — konsisten dengan skala default Tailwind. Ritme vertikal section-level memakai kelipatan **8px** yang lebih besar (soft 8pt grid).

## Skala numerik lengkap (rekomendasi kanonik untuk build)

| Step | rem | px | Contoh pemakaian |
|---|---|---|---|
| `space-1` | 0.25rem | 4px | Gap ikon-teks, padding badge kecil |
| `space-2` | 0.5rem | 8px | Gap antar elemen inline, padding chip |
| `space-3` | 0.75rem | 12px | Padding button kecil, gap form label-input |
| `space-4` | 1rem | 16px | **`stack-sm`** — gap antar field form, padding compact card |
| `space-5` | 1.25rem | 20px | Padding icon-button |
| `space-6` | 1.5rem | 24px | **`container-padding`** (mobile safe-area) — padding horizontal halaman di mobile |
| `space-8` | 2rem | 32px | **`stack-md` / `gutter` / `card-padding`** — padding card, gutter grid desktop, gap antar card |
| `space-10` | 2.5rem | 40px | Padding section kecil |
| `space-12` | 3rem | 48px | Gap antar sub-section |
| `space-16` | 4rem | 64px | **`section-gap-md`** — jarak antar section (mobile Warm / desktop legacy Patriotic) |
| `space-20` | 5rem | 80px | Padding hero (opsional) |
| `space-24` | 6rem | 96px | **`section-gap-lg`** — jarak antar section besar (skala Patriotic) |
| `space-32` | 8rem | 128px | **`section-gap`** — jarak antar section desktop (skala Warm, kanonik) — *"whitespace as a feature"* |

## Token semantik (dipakai langsung sebagai nama di `tailwind.config.spacing`)

Ini adalah token **yang benar-benar ter-generate** di kode prototipe final (`stack-md`, `gutter`, `container-max`, `section-gap`, `stack-sm`) — gabungkan dengan token dari `DESIGN.md` yang belum semua ter-shipped ke kode (`container-padding`, `card-padding`, `grid-gutter` dari Patriotic) untuk skala final yang lengkap:

| Token | Nilai | Peran |
|---|---|---|
| `stack-sm` | 1rem (16px) | Jarak antar elemen kecil dalam satu blok (label→input, ikon→teks) |
| `stack-md` | 2rem (32px) | Jarak antar blok dalam satu card/section |
| `gutter` | 2rem (32px) | Jarak antar kolom grid (desktop) |
| `container-padding` | 1.5rem (24px) | Padding horizontal container di mobile/tablet |
| `card-padding` | 2rem (32px) | Padding internal card standar |
| `section-gap` | 8rem (128px) desktop → 4rem (64px) mobile | Jarak vertikal antar section besar di landing page |
| `container-max` | 1200px | Lebar maksimum container desktop |

## Container & Grid

- **Container max-width: 1200px**, konten di-center dengan margin otomatis (`mx-auto`), dengan padding horizontal `container-padding` (24px) di bawah breakpoint desktop.
- **Grid 12-kolom** untuk layout umum. Grid kartu (regional branches, stats, event cards) memakai `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`/`4` tergantung konten (dikonfirmasi dari kelas nyata di `regional_branches_ppi_tiongkok/code.html`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-2`, dan disebutkan di `DESIGN.md` bahwa Stats & Regional Directory pakai 3–4 kolom di beberapa varian — **verifikasi per-halaman saat implementasi**, karena pola grid tidak 100% seragam di seluruh prototipe).
- **Gutter grid**: 32px desktop, turun ke 24px di mobile/tablet.

## Breakpoints

Memakai breakpoint default Tailwind, dikonfirmasi lewat pemakaian `md:`/`lg:` di kode dan disebut eksplisit di `DESIGN.md` ("*at the 768px breakpoint, multi-column grids collapse*"):

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| Base (mobile) | < 768px | 1 kolom, `container-padding` 24px, `section-gap` turun ke 64px |
| `md:` | ≥ 768px | 2 kolom mulai aktif |
| `lg:` | ≥ 1024px | Kolom penuh (3–4), container mencapai max-width 1200px |

## Ritme Vertikal (Vertical Rhythm)

Prinsip dari `warm_institutional/DESIGN.md`: **"whitespace sebagai fitur, bukan sisa ruang"**. Section besar di landing page (Hero → Stats → Events → Quote → Branches → Partners) dipisahkan `section-gap` penuh (128px desktop), bukan dijejalkan. Ini konsisten dengan positioning "lifestyle institutional hub" — jangan kompres spacing ini demi memuat lebih banyak konten di atas lipatan (above the fold); prioritaskan hierarki bacaan.

Di dalam satu section, gunakan `stack-md` (32px) antar blok konten dan `stack-sm` (16px) antar elemen form/list yang berkerabat erat.

## Rekomendasi implementasi

1. Definisikan skala `space-1`…`space-32` di atas sebagai `theme.extend.spacing` di Tailwind config produksi — jangan pakai skala default Tailwind mentah-mentah karena section-gap 128px (`space-32`) tidak ada di default scale.
2. Pertahankan nama token semantik (`stack-sm`, `stack-md`, `gutter`, `section-gap`, `container-padding`, `card-padding`) sebagai **alias** di atas skala numerik — supaya class HTML hasil Stitch (`p-card-padding`, `gap-gutter`, dst) tetap valid tanpa perlu di-refactor satu-satu.
3. `container-max: 1200px` menang atas nilai lama 1280px dari Patriotic — **1200px adalah nilai final** karena itulah yang di-generate di file `_final_refinement`.

## Terkait

- [Elevation & Shadows](./Elevation%20&%20Shadows.md)
- [Components](./Components.md)
