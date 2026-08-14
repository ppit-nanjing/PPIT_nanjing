# Color System

> Bagian dari [Design System Overview](./Design%20System%20Overview.md).

Palet mengikuti struktur token bergaya **Material Design 3** (surface/on-surface/container tiers), diwarnai dengan identitas merah-putih Indonesia. Sistem kanonik = **Warm Institutional**. Sistem lama (Patriotic Institutional) didokumentasikan di bawah sebagai referensi historis/legacy.

## Brand Core

| Token | Hex | Peran |
|---|---|---|
| `primary` | `#b00816` | Merah dasar — teks aksen, border fokus, ikon aktif |
| `primary-container` | `#d42b2b` | Merah terang — **background tombol utama/CTA**, highlight brand |
| `on-primary` / `on-primary-container` | `#ffffff` / `#fff0ef` | Teks di atas merah |
| `inverse-primary` | `#ffb4ac` | Merah untuk dark surface / state terbalik |
| `error` | `#ba1a1a` | Error state (form validation, destructive) |
| `on-error-container` | `#93000a` | Teks error di atas `error-container` (`#ffdad6`) |

## Neutral / Surface (Warm Institutional)

| Token | Hex | Peran |
|---|---|---|
| `background` / `surface` | `#fff8f7` | Latar utama halaman |
| `surface-dim` | `#f1d3d1` | Latar redup untuk seksi alternatif |
| `surface-container-lowest` | `#ffffff` | Card di atas background berwarna |
| `surface-container-low` | `#fff0ef` | Card level 1 |
| `surface-container` | `#ffe9e7` | Card level 2 (default card) |
| `surface-container-high` | `#ffe1df` | Card level 3 (hover/selected) |
| `surface-container-highest` | `#fadcd9` | Card level 4 (paling menonjol) |
| `on-surface` | `#271716` | Teks utama (near-black hangat, bukan pure black) |
| `on-surface-variant` | `#5c403d` | Teks sekunder |
| `outline` / `outline-variant` | `#906f6c` / `#e4bdb9` | Border tegas / border halus |
| `inverse-surface` / `inverse-on-surface` | `#3e2c2b` / `#ffedeb` | Footer gelap, toast, tooltip dark |

## Secondary & Tertiary

| Token | Hex | Peran |
|---|---|---|
| `secondary` | `#5f5e5b` | Teks/ikon sekunder abu-hangat |
| `secondary-container` / `on-secondary-container` | `#e2dfdb` / `#636260` | Badge/chip netral |
| `tertiary` | `#5a5650` | Aksen ketiga (abu-taupe, menggantikan biru di Patriotic) |
| `tertiary-container` / `on-tertiary-container` | `#736e68` / `#f9f2ea` | Badge kategori alternatif |

## Extended brand tokens (Warm Institutional)

| Token | Hex | Peran |
|---|---|---|
| `warm-cream` | `#fdfaf6` | Latar section besar — lebih hangat dari putih polos |
| `soft-gray` | `#f2f0ed` | Latar netral untuk input field / divider pengganti garis |
| `muted-gold` | `#c5a368` | Aksen dekoratif premium (dipakai selektif — motif emas, lihat [Iconography & Imagery](./Iconography%20&%20Imagery.md)) |

## Fixed tones (Material 3 pattern)

Set lengkap `primary-fixed` / `-dim`, `on-primary-fixed` / `-variant`, dan padanannya untuk secondary & tertiary tersedia di kedua `DESIGN.md` sumber — dipakai untuk komponen yang butuh warna konsisten terlepas dari light/dark mode (mis. badge di atas foto). Tidak diulang di sini secara penuh; rujuk `warm_institutional/DESIGN.md` di folder prototipe untuk nilai persis bila dibutuhkan saat implementasi token Tailwind.

## Legacy — Patriotic Institutional (v1, untuk referensi)

Struktur sama, nilai berbeda tipis pada beberapa token kunci:

| Token | Warm (kanonik) | Patriotic (legacy) |
|---|---|---|
| `tertiary` | `#5a5650` (taupe) | `#005d80` (biru) |
| `secondary` | `#5f5e5b` | `#5f5e5e` |
| Token ekstensi | `warm-cream`, `soft-gray`, `muted-gold` | `brand-red-deep` (`#A63232`), `surface-muted` (`#F9F9F9`), `border-light` (`#E5E7EB`) |

⚠️ Kedua set token ekstensi (Warm dan Patriotic) ditemukan **dipakai bersamaan** di banyak file `code.html` yang sama — misalnya form input di `login_refined_inputs` memakai `bg-surface-muted border-border-light` (token Patriotic) padahal file itu sendiri sudah mengadopsi skala tipografi & spacing Warm. Ini indikasi token belum dikonsolidasi. **Sebelum build:** pilih satu nama per peran (rekomendasi — pakai `soft-gray` untuk latar input, hapus `surface-muted`/`border-light`/`brand-red-deep` dari config final) dan jadikan token Tailwind (`tailwind.config.colors`) sebagai satu-satunya sumber kebenaran warna.

## Kontras & Aksesibilitas

- `on-surface` (`#271716`) di atas `background` (`#fff8f7`) → kontras tinggi, aman untuk body text.
- `on-primary` (putih) di atas `primary-container` (`#d42b2b`) → rasio kontras ±4.6:1, **lolos AA untuk teks besar/bold**, gunakan ukuran teks tombol ≥ 16px bold agar aman di semua kondisi.
- Hindari menaruh teks `primary` (`#b00816`) di atas `surface-dim`/`surface-container-highest` — kontrasnya turun, gunakan `on-surface` untuk body text dan simpan `primary` untuk teks aksen pendek/link.

## Terkait

- [Elevation & Shadows](./Elevation%20&%20Shadows.md) — bayangan bertema merah untuk CTA
- [Components](./Components.md) — penerapan warna di komponen nyata
