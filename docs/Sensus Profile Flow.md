# Sensus Profile Flow

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## Apa itu "Sensus"?

**Sensus PPI Tiongkok** adalah pendataan resmi seluruh mahasiswa Indonesia di Tiongkok yang dilakukan organisasi secara berkala — bukan sekadar "lengkapi profil" biasa. Ini layar dengan **iterasi desain terbanyak kedua** setelah Homepage (6 varian): `sensus_profile_completion_ppit_nanjing`, `_master_edition` (kanonik), `_interactive`, `_refined_inputs`, `_completion_refined`, `_navigation_updated` — menandakan ini prioritas produk yang tinggi.

## Karakteristik

- **Form multi-step/bertahap** (bukan form panjang satu halaman) — tersirat dari nama varian `_interactive` dan `_completion_*`.
- Field mencakup: universitas, jurusan, jenjang, kota domisili di Tiongkok, tanggal kedatangan, jenis visa, jenis beasiswa, kontak darurat — lihat detail lengkap di [Data Dictionary](./Data%20Dictionary.md) § SENSUS_PROFILE.
- Terpisah dari **Edit Profile** (`edit_profile_refined_inputs`) yang lebih ringan — sensus untuk data demografis/administratif organisasi, edit profile untuk data akun (nama tampilan, foto, kontak).

## Entitas terkait

[SENSUS_PROFILE](./Data%20Dictionary.md) (1:1 dengan [USER](./Data%20Dictionary.md))

## Terkait admin

Data agregat sensus dilaporkan di [Reports & Analytics](./Reports%20&%20Analytics.md) § Sensus Summary Report — laporan ini kemungkinan jadi alasan utama data sensus dikumpulkan (pelaporan ke organisasi tingkat nasional PPI Tiongkok atau ke KBRI/Atdikbud).

## Catatan implementasi

Karena form ini panjang & bertahap, **simpan progres per-langkah** (bukan hanya submit di akhir) — `completion_status` di [Data Dictionary](./Data%20Dictionary.md) mendukung status `incomplete`, memungkinkan user melanjutkan nanti tanpa kehilangan data yang sudah diisi. React Hook Form + step-based state (lihat [Tech Stack](./Tech%20Stack.md)) cocok untuk pola ini.
