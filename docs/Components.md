# Components

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Pola diverifikasi langsung dari markup nyata di beberapa file `code.html` representatif (homepage, login, regional branches), disilangkan dengan deskripsi komponen di kedua `DESIGN.md`.

## Shape Language

- **Radius kanonik (Warm): 8px default** (`rounded` = 0.5rem), `sm` 4px, `md` 12px, `lg` 16px, `xl` 24px (card foto besar), `full` untuk pill/avatar.
- ⚠️ Kode prototipe `_final_refinement` yang sudah dicek nyatanya masih men-generate radius versi lama (`DEFAULT: 0.25rem`) — lihat catatan drift di [Design System Overview](./Design%20System%20Overview.md). Pakai tabel di atas sebagai target final, bukan yang ada di kode sekarang.

## Button

- **Primary**: background `primary-container` (`#d42b2b`), teks `on-primary` putih, `rounded-lg`, padding `px-8 py-4` (besar) / `py-4` full-width (form), font `label-caps` (uppercase, tracking lebar).
- **Hover/interaksi**: `hover:bg-primary` (gelap sedikit) + `hover:scale-105` + shadow naik ke `elevation-cta` (lihat [Elevation & Shadows](./Elevation%20&%20Shadows.md)) — durasi `duration-300`.
- **Focus**: `focus:ring-4 focus:ring-primary/30` — ring lebar & lembut, penting untuk aksesibilitas keyboard.
- **Secondary/ghost**: background transparan, `hover:bg-surface-variant`, dipakai untuk aksi sekunder di navbar/toolbar.

## Card

- Default: background `surface-container` atau putih, radius 8px, **tanpa border jika di atas background putih**, `elevation-ambient` (shadow sangat halus) sebagai pengganti border.
- Padding internal konsisten: `card-padding` (32px) — lihat [Spacing System](./Spacing%20System.md).
- Card di atas background putih (mis. daftar cabang regional): boleh pakai border tipis `outline-variant` alih-alih shadow.
- Hover (untuk card yang clickable): scale 1.02 + shadow naik satu level (Motion Tier 3).

## Input Field

Pola nyata dari `login_refined_inputs`:
```
w-full pl-10 pr-4 py-3 bg-surface-muted border border-border-light rounded-lg
focus:ring-1 focus:ring-primary focus:border-primary transition-colors
text-on-surface font-body-md text-body-md placeholder-secondary-fixed-dim focus:ring-2
```
- Padding kiri besar (`pl-10`) untuk ikon leading (search, email, dsb).
- State fokus: border + ring warna `primary`, transisi warna halus.
- Checkbox: `w-4 h-4 text-primary ... rounded focus:ring-primary focus:ring-2`.
- **Rekomendasi konsolidasi**: ganti `bg-surface-muted`/`border-border-light` (token legacy Patriotic) menjadi `bg-soft-gray` (token Warm resmi) — lihat catatan di [Color System](./Color%20System.md).

## Chip / Badge

Pill-shaped, tint rendah-opacity dari `primary` atau `tertiary`, teks `label-caps` uppercase. Dipakai untuk kategori event/news dan status (mis. "Pending", "Approved" di admin console).

## Navigasi

- **Navbar publik**: sticky top, logo kiri + menu horizontal + CTA kanan, item menu berupa button ghost (`hover:bg-surface-variant rounded-lg`).
- **Sidebar admin**: pola "Slide & Push" (lihat [Motion & Animation](./Motion%20&%20Animation.md)), grouping menu per modul (Dashboard, Users, Organization, Events, Inventory, Reports, Documentation).
- **Footer**: blok kontras tinggi (dark, `inverse-surface`), logo + ikon sosial + navigasi dipisah karakter `|` (piped navigation) — pola diambil langsung dari situs nasional PPI Tiongkok yang jadi referensi.

## Grid / List

- Grid kartu responsif: `grid-cols-1 md:grid-cols-2 lg:grid-cols-2/3/4` tergantung densitas konten.
- List vertikal (mis. direktori cabang regional): item dengan caret `›` sebagai indikator aksi, bukan tombol eksplisit — pola hemat visual untuk daftar panjang.

## Tabel (Admin Console)

Dipakai luas di modul admin (User Management, Borrow Requests, dsb): header sticky, baris zebra/hover halus (`hover:bg-surface-container-low`), aksi per-baris di kolom kanan (ikon edit/hapus), shadow `elevation-panel`.

## Empty State & Success State

Prototipe punya state khusus untuk hasil aksi (`event_registration_success`, `job_application_success`, `borrow_request_success`) — pola konsisten: ikon centang besar di `surface-container-highest`, headline singkat, body penjelas, CTA lanjutan ("Lihat Riwayat", "Kembali ke Beranda"). Lihat detail per-flow di [folder Screens/Public](./README.md).

## Terkait

- [Motion & Animation](./Motion%20&%20Animation.md) — animasi hover/transisi di atas
- [Data Dictionary](./Data%20Dictionary.md) — status/enum yang tampil sebagai badge
