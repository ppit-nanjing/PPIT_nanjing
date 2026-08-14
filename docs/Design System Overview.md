# Design System Overview — PPIT Nanjing

> Hub note. Bagian dari [PPIT Nanjing MOC](./README.md).

## Sumber

Sistem desain ini **bukan dibuat dari nol** — direkonstruksi dan disatukan dari yang sudah ada di dalam kedua folder prototyping (`stitch_ppit_nanjing_web_portal/` dan `stitch_ppit_nanjing_web_portal (1)/`, hasil generate Google Stitch):

- `patriotic_institutional/DESIGN.md` — sistem desain generasi pertama ("Patriotic Institutional")
- `warm_institutional/DESIGN.md` — evolusi resmi dari sistem pertama ("Warm Institutional")
- `ppit_nanjing_animation_system_prd.md` — PRD sistem animasi & interaksi
- Konfigurasi `tailwind.config` yang di-embed di dalam ~95 file `code.html` prototipe

## Dua Generasi Desain — mana yang dipakai?

| | **Patriotic Institutional** (v1) | **Warm Institutional** (v2 — kanonik) |
|---|---|---|
| Status | Legacy, masih dipakai di sebagian layar awal | **Rekomendasi resmi** — dipakai di semua file `*_master_edition`, `*_final_refinement`, `*_refined_*` |
| Karakter | Formal, kontras tinggi, kaku (birokratis) | Lebih hangat, lapang, "lifestyle", tetap institusional |
| Radius dasar | 4px (tegas) | 8px (lembut) |
| Section gap desktop | 96px | 128px |

Warm Institutional secara eksplisit ditulis sebagai **evolusi** dari Patriotic ("*This design system evolves the Patriotic Institutional aesthetic into a more approachable, Warm Institutional identity*"). File-file dengan penanda `_master_edition`, `_final_refinement`, `_refined_*`, `_navigation_updated` — yaitu iterasi paling akhir dari tiap layar — semuanya sudah memakai token warna & tipografi Warm Institutional. **Maka dokumen ini menjadikan Warm Institutional sebagai sistem kanonik**, dengan Patriotic didokumentasikan sebagai referensi historis di [Color System](./Color%20System.md).

## ⚠️ Temuan penting: drift antara spek dan implementasi

Saat membandingkan `DESIGN.md` dengan `tailwind.config` yang benar-benar di-embed di file `code.html` "final" (mis. `ppit_nanjing_homepage_final_refinement`), ditemukan **inkonsistensi radius**: warna & spacing yang dipakai sudah 100% Warm Institutional, tapi `borderRadius` yang ter-generate masih memakai skala lama Patriotic (`DEFAULT: 0.25rem`, bukan `0.5rem` seperti spek Warm). Ini kemungkinan bug/miss saat Stitch meng-generate ulang layar tanpa menyinkronkan token radius baru.

**Rekomendasi:** sebelum development dimulai, tim desain memutuskan satu radius scale final (dokumen ini merekomendasikan skala Warm — lihat [Spacing System](./Spacing%20System.md)) lalu menerapkannya konsisten di semua komponen — jangan lanjutkan drift ini ke kode produksi.

Ditemukan juga token warna "duplikat" dari dua generasi yang sama-sama dipakai di file yang sama (`surface-muted` #F9F9F9 vs `soft-gray` #f2f0ed; `brand-red-deep` #A63232 vs `primary` #b00816). Rekomendasi konsolidasi ada di [Color System](./Color%20System.md).

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
