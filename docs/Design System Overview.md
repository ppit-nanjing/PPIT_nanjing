# Design System Overview — PPIT Nanjing

> Hub note. Bagian dari [PPIT Nanjing MOC](./README.md).

## Sumber

Sistem desain ini **bukan dibuat dari nol** — direkonstruksi dan disatukan dari yang sudah ada di dalam kedua folder prototyping (`stitch_ppit_nanjing_web_portal/` dan `stitch_ppit_nanjing_web_portal (1)/`, hasil generate Google Stitch):

- `patriotic_institutional/DESIGN.md` — sistem desain generasi pertama ("Patriotic Institutional")
- `warm_institutional/DESIGN.md` — evolusi resmi dari sistem pertama ("Warm Institutional")
- `ppit_nanjing_animation_system_prd.md` — PRD sistem animasi & interaksi
- Konfigurasi `tailwind.config` yang di-embed di dalam ~95 file `code.html` prototipe

## Status sistem desain

Sumber kebenaran visual sekarang adalah **[DESIGN.md](../DESIGN.md)** di root repo, yang mendeskripsikan sistem **"The Gilded Courtyard"**: Art Deco + Art Nouveau dalam gading hangat, jade pekat, dan emas antik; Cinzel, Josefin Sans, dan Cormorant Garamond; enam palet (tiga tema kota × terang/gelap). Implementasinya ada di `src/app/globals.css` dan komponen di `src/components/`. Sistem sebelumnya (Scholar's Courtyard dengan Spectral + Plus Jakarta Sans, dan sebelumnya lagi Warm Institutional dan Patriotic Institutional dari prototipe Stitch) sudah digantikan. Catatan prototipe dan bagian historis lama hanya referensi sejarah; jangan mengekstrak token darinya.

Saat mengubah token atau UI global: uji terang dan gelap di ketiga tema kota dan jalankan `npm run check:contrast` (lihat [Color System](./Color%20System.md)).

## Isi Design System

- [Color System](./Color%20System.md) — palet warna, token Material-3-style, penggunaan
- [Typography](./Typography.md) — skala tipografi, font, hierarki
- [Spacing System](./Spacing%20System.md) — skala spacing, grid, container, breakpoint
- [Elevation & Shadows](./Elevation%20&%20Shadows.md) — sistem bayangan/elevasi
- [Iconography & Imagery](./Iconography%20&%20Imagery.md) — ikon dan arah visual foto/ilustrasi
- [Components](./Components.md) — pola komponen UI (button, card, input, dll)
- [Motion & Animation](./Motion%20&%20Animation.md) — sistem animasi & interaksi

## Brand Positioning

Identitas brand berakar pada semangat kebangsaan Indonesia dalam konteks akademik Tiongkok — menyeimbangkan **otoritas institusional** (organisasi resmi mahasiswa) dengan pendekatan **hangat dan berbasis komunitas**. Gaya visual: **Corporate/Modern** dengan kecenderungan **Minimalism** — whitespace lapang, hierarki tipografi tegas, dan aksen budaya fusion Indonesia × Tiongkok (lihat [Iconography & Imagery](./Iconography%20&%20Imagery.md)).

Referensi organisasi induk (PPI Tiongkok nasional, `ppitiongkok.com`) menggunakan tagline: *"Wadah resmi perhimpunan pelajar Indonesia di Tiongkok untuk bersinergi, berkarya, dan berkontribusi bagi bangsa."* — PPIT Nanjing adalah portal cabang regional Nanjing dari organisasi payung ini, lihat [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md).
