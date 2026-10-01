# Typography

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Sumber kebenaran teknis: `src/app/layout.tsx` (pemuatan font) + `@theme` dan blok "Hierarki font" di `src/app/globals.css` (token skala). Aturan lengkap ada di [DESIGN.md](../DESIGN.md) § Typography. Diperbarui untuk redesain Art Deco + Art Nouveau (2026-10); sistem lama (Spectral + Plus Jakarta Sans) tinggal sejarah.

## Font Family

| Peran | Typeface | Kenapa |
|---|---|---|
| **Display / judul** (H1–H3), **label**, tombol, angka statistik | **Cinzel** (huruf kapital berukir, gaya prasasti) | Suara Art Deco: judul terbaca seperti tulisan di gerbang. Huruf kecil tampil sebagai kapital kecil, jadi judul terasa seragam. |
| **Badan, UI, tabel**, H4–H6 | **Josefin Sans** (geometris) | Terbuka dan modern di samping Cinzel. x-height-nya kecil, jadi skala badan sengaja naik setengah poin dari skala lama. |
| **Kutipan** (hanya kutipan pimpinan) | **Cormorant Garamond** italic | Suara sastra untuk kata-kata ketua. |
| **Fallback CJK** | PingFang SC → Hiragino Sans GB → Microsoft YaHei → Noto Sans CJK SC (sans); Georgia → Songti SC → SimSun (serif) | Nama tempat / kampus / label tema (紫金山) muncul inline dengan teks Latin; tidak ada face Latin yang menutup glyph Han. |

Ketiganya adalah **font variabel yang di-self-host lewat `next/font/google`**: di-download dan di-bundle saat build, **nol request runtime ke `fonts.googleapis.com`**. Ini wajib untuk keterjangkauan dari Tiongkok daratan dan karena CSP produksi `font-src 'self'` (lihat [Tech Stack](./Tech%20Stack.md)). Jangan menambahkan `<link>` ke Google Fonts atau `@import` font dari CDN di file ini. Font variabel tidak diberi daftar `weight` (satu query per font, menghindari kegagalan pemuat Turbopack untuk bobot diskret yang tercatat di `layout.tsx`).

Plus Jakarta Sans dan Spectral (font lama) **masih dimuat** dengan `preload: false`, hanya agar pemilih font deskripsi acara (`src/lib/event-description-style.ts`) tetap bisa menawarkannya. Keduanya tidak dipakai di tipografi situs.

Ikon: **Lucide React** (di-bundle), bukan Material Symbols via CDN. Lihat [Iconography & Imagery](./Iconography%20&%20Imagery.md).

## Hierarki per level

Hierarki ditegakkan lewat **ukuran + weight + pilihan face**, bukan warna. Kelas token (`text-display-hero`, `text-headline-lg`, dst) di-generate dari `@theme`; kelas `text-display-*`, `text-headline-*`, `text-label-caps` juga membawa face Cinzel sendiri (aturan di `globals.css`), jadi berlaku walau dipasang pada `<p>` atau `<span>`.

| Level | Face | Token / kelas | Ukuran | Weight | Pemakaian |
|---|---|---|---|---|---|
| **H1** — hero halaman | Cinzel | `text-display-hero` | 54px (mobile 30px) | 600, +0.01em | Satu per halaman: judul hero. |
| **H1/H2** — judul section | Cinzel | `text-headline-lg` | 30px | 600, +0.02em | Kepala section besar. |
| **H3** — judul card / subsection | Cinzel | `text-headline-md` | 22px | 600, +0.02em | Judul card, sub-bagian, judul modal. |
| **Judul kecil** | Cinzel | `text-headline-sm` | 18px | 600, +0.03em | Judul kartu kota, wordmark nav dan footer. |
| **H4–H6** — sub-judul inline | Josefin Sans | `text-body-lg` + `font-semibold` | 19px | 600 | Sub-judul di dalam badan teks. Sengaja bukan Cinzel. |
| **Lead / intro** | Josefin Sans | `text-body-lg` | 19px | 400 | Paragraf pembuka. |
| **Body** | Josefin Sans | `text-body-md` | 16.5px | 400 | Teks isi default. |
| **Body kecil** | Josefin Sans | `text-body-sm` | 14.5px | 400 | Caption, metadata, blurb sekunder. |
| **Label CAPS / eyebrow** | Cinzel | `text-label-caps` | 12px | 600, +0.14em | Eyebrow, badge, teks tombol, header tabel. Selalu UPPERCASE. Eyebrow memakai `tracking-[0.3em]`. |
| **Kutipan** | Cormorant Garamond | `text-quote-text` | 24px | italic | Kutipan pimpinan. |
| **Angka statistik** | Cinzel | `text-headline-lg` | 30px | 600 | Angka di dalam cincin emas, label `label-caps` gold-ink di bawahnya. |

## Prinsip

- **Hierarki lewat ukuran + weight + face**, tidak pernah lewat warna saja.
- **Cinzel untuk baris, bukan paragraf.** Judul, label, tombol, angka. Jangan menyetel paragraf dalam Cinzel dan jangan memakainya untuk sub-judul H4+.
- **Uppercase label** selalu dengan tracking positif agar terbaca meski 12px.
- **Bobot badan ≥ 400.** Josefin Sans 300 terlalu tipis di layar Android murah.
- **Kutipan** hanya Cormorant, dan hanya kutipan.
- Cinzel lebar: uji judul terpanjang (berita, acara, bahasa Inggris) di layar 375px; `text-balance` dipakai pada judul.

## Bahasa Konten

Default `lang="id"`. i18n memakai kamus custom (`src/lib/i18n/`), locale `id`/`en`, tanpa prefix URL. Lihat [AGENTS.md](../AGENTS.md) § Internationalization. Sebagian besar `/console` sengaja tetap Bahasa Indonesia (pembacanya pengurus). Konten buatan admin di DB tidak diterjemahkan otomatis.

## Terkait

- [Spacing System](./Spacing%20System.md): jarak vertikal antar blok teks
- [Components](./Components.md)
- [Iconography & Imagery](./Iconography%20&%20Imagery.md)
