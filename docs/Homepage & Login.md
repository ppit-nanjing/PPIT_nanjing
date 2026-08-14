# Homepage & Login

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## Homepage (`/`)

Layar paling banyak diiterasi di seluruh prototipe (6 varian: `ppit_nanjing_homepage`, `_refined_1`, `_refined_2`, `_final_refinement`, `_animated`, `_navigation_updated`, `_logged_in_workflow_connected`) — versi kanonik untuk referensi visual: **`ppit_nanjing_homepage_final_refinement`**.

Struktur konten (dikonfirmasi dari markup + konten referensi situs nasional `ppitiongkok.com`):
1. Hero — headline besar (`display-hero`), tagline, CTA ganda ("Eksplorasi Kegiatan" + sekunder), badge "EST. 2012"
2. Statistik organisasi (jumlah mahasiswa, jumlah cabang, event/tahun, volunteer) — angka besar bold
3. Latest Events (preview, link ke [Event Flow](./Event%20Flow.md))
4. Latest News (preview, link ke [Content Pages](./Content%20Pages.md))
5. Kutipan Ketua Umum (quote block, `quote-text` style)
6. "Connected Across China" — peta/direktori cabang regional (link ke [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md))
7. AD/ART card (dokumen resmi, unduh PDF)
8. Partners/Networks section
9. Footer — navigasi piped (`|`), ikon sosial (Facebook, X, Instagram, YouTube, LinkedIn)

**State bersyarat**: `ppit_nanjing_homepage_logged_in_workflow_connected` menunjukkan tampilan berbeda untuk user yang sudah login (kemungkinan CTA berubah dari "Join Us"/"Login" menjadi akses cepat ke profil/dashboard).

## Login (`/login`)

3 varian: `login_ppit_nanjing` (dasar), `login_refined_inputs` (pola input final — lihat [Components](./Components.md) § Input Field), `login_with_google` (OAuth).

- Form: email + password, checkbox "remember me", link "forgot password" (bukan layar terpisah di prototipe — perlu ditambahkan saat build).
- **Login with Google** — tombol OAuth terpisah, mengonfirmasi Supabase Auth Google Provider sebagai pilihan tepat (lihat [Tech Stack](./Tech%20Stack.md)).

## Entitas terkait

[USER](./Data%20Dictionary.md), [ROLE](./Data%20Dictionary.md) — lihat [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md).

## Alur lanjutan

Login berhasil → redirect ke Homepage (state logged-in) atau `/admin` jika role admin. Belum punya akun → [Join Us Flow](./Join%20Us%20Flow.md).
