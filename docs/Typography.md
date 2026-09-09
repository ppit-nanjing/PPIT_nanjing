# Typography

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Sumber kebenaran teknis: `src/app/layout.tsx` (pemuatan font) + `@theme` di `src/app/globals.css` (token skala).

## Font Family

| Peran | Typeface | Kenapa |
|---|---|---|
| **Display / judul** (H1–H3) | **Spectral** (serif) | Nanjing sebagai ibu kota sastra Jiangnan (六朝古都). Memberi bobot "institusi resmi" tanpa terasa kaku. |
| **Badan, UI, label, tabel** | **Plus Jakarta Sans** (humanist sans) | Dikomisikan untuk branding kota Jakarta — sans berakar Indonesia, hangat di ukuran baca, tetap rapi di tabel `/console` yang padat. Menggantikan Inter (mulai 2026-09-09). |
| **Fallback CJK** | PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC | Nama tempat / kampus / label tema (紫金山) muncul inline dengan teks Latin; tidak ada face Latin yang menutup glyph Han. |

Keduanya **di-self-host lewat `next/font/google`** — di-download & di-bundle saat build, **nol request runtime ke `fonts.googleapis.com`** (wajib untuk keterjangkauan dari Tiongkok daratan, lihat [Tech Stack](./Tech%20Stack.md)). Jangan pernah menambahkan `<link>` ke Google Fonts atau `@import` font dari CDN di file ini.

Weight yang dimuat: Plus Jakarta Sans `400/500/600/700/800`, Spectral `400/600/800`.

Ikon: **Lucide React** (di-bundle), bukan Material Symbols via CDN — lihat [Iconography & Imagery](./Iconography%20&%20Imagery.md).

## Hierarki per level

Hierarki ditegakkan lewat **ukuran + weight + pilihan face**, bukan warna. Kelas utility (`text-display-hero`, `text-headline-lg`, dst) di-generate dari token `@theme` di `globals.css`.

| Level | Face | Token / kelas | Ukuran | Weight | Pemakaian |
|---|---|---|---|---|---|
| **H1** — hero halaman | Spectral | `text-display-hero` | 56px (mobile 36px) | 800 | Satu per halaman: judul hero. |
| **H1/H2** — judul section | Spectral | `text-headline-lg` | 32px | 700 | Kepala section besar di halaman publik. |
| **H3** — judul card / subsection | Spectral | `text-headline-md` | 24px | 700 | Judul card, sub-bagian, judul modal. |
| **H4–H6** — sub-judul inline | Plus Jakarta Sans | `text-body-lg` + `font-semibold` | 18px | 600 | Sub-judul di dalam badan teks (legal, artikel, detail). Sengaja **sans** — sedekat ini ke body, serif malah mengganggu. |
| **Lead / intro** | Plus Jakarta Sans | `text-body-lg` | 18px | 400 | Paragraf pembuka, teks pengantar. |
| **Body** | Plus Jakarta Sans | `text-body-md` | 16px | 400 | Teks isi default. |
| **Label CAPS / eyebrow** | Plus Jakarta Sans | `text-label-caps` | 12px | 600, +0.1em | Eyebrow di atas judul, kategori section, badge. Selalu tracking positif. |
| **Kutipan** | Spectral | `text-quote-text` | 22px | 400, italic | Kutipan pimpinan / testimoni. Kata kunci di-bold atau diwarnai `primary`. |
| **Statistik besar** | Plus Jakarta Sans | setara `text-headline-lg`/`display-hero` | — | 700–800 | Angka besar ("15K+") dipasangkan `label-caps` kecil di bawahnya. |

Aturan di `globals.css`: `h1,h2,h3 { font-family: var(--font-serif) }` dan `h4,h5,h6 { font-family: var(--font-sans); font-weight: 600 }`. Kelas utility Tailwind tetap menang atas default ini, jadi elemen yang sudah diberi kelas ukuran/weight tidak berubah.

## Legacy — Patriotic Institutional (v1)

Skala lama, dijaga sebagai referensi historis saja (Warm Institutional adalah kanonik):

| Token | Ukuran | Weight | Line-height |
|---|---|---|---|
| `display-hero` | 48px (mobile 32px) | 800 | 1.1 |
| `headline-lg` | 32px | 700 | 40px |
| `headline-md` | 24px | 700 | 32px |
| `body-lg` | 18px | 400 | 28px |
| `body-md` | 16px | 400 | 24px |
| `label-caps` | 12px | 700 | 16px, +0.05em |
| `quote-text` | 20px | 400 | 32px |

Warm Institutional sengaja lebih "lapang": hero 56px (vs 48px), line-height rasio (bukan px absolut), tracking label lebih lebar.

## Prinsip

- **Hierarki lewat ukuran + weight + face**, tidak pernah lewat warna saja.
- **H1–H3 serif, sisanya sans.** Jangan memakai serif untuk sub-judul H4+ atau untuk UI.
- **Uppercase label** selalu dengan tracking positif (`+0.1em`) agar terbaca meski 12px.
- **Kutipan** lebih besar dari `body-lg` tapi lebih ringan secara visual (italic Spectral).

## Bahasa Konten

Default `lang="id"`. i18n memakai kamus custom (`src/lib/i18n/`), locale `id`/`en`, tanpa prefix URL — lihat [AGENTS.md](../AGENTS.md) § Internationalization. Sebagian besar `/console` sengaja tetap Bahasa Indonesia (pembacanya pengurus). Konten buatan admin di DB tidak diterjemahkan otomatis.

## Terkait

- [Spacing System](./Spacing%20System.md) — jarak vertikal antar blok teks
- [Components](./Components.md)
- [Iconography & Imagery](./Iconography%20&%20Imagery.md)
