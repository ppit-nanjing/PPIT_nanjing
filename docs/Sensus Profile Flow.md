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

- **Data per orang + bukti** ada di `/console/sensus`: daftar dengan filter (cari pengguna, dropdown universitas/kampus, cabang, kelengkapan, bukti) + tombol **Ekspor CSV/XLSX** yang mengikuti filter aktif (route `/api/console/sensus/export`, kolom bersama di `src/lib/sensus-export.ts`). Halaman detail per orang bisa **Ubah / Hapus** (server action di `src/app/actions/sensus.ts`); setiap perubahan tercatat ke `audit_logs` (`entity_type = "sensus_profile"`) dan terlihat di `/console/sensus/audit-log` + section "Riwayat Perubahan" di halaman detail. **Tidak ada "buat baru"** — baris sensus lahir dari mahasiswa mengisi `/sensus`. Layar ini terkunci ke modul admin **`sensus`** — untuk sekarang hanya **BPH + Divisi Teknologi** (akun full-admin). Modul `sensus` tetap muncul sebagai checkbox di `/console/organization` sehingga full-admin bisa memberikannya ke divisi lain (mis. Humas) nanti; ia termasuk `SENSITIVE_SCOPE_KEYS` jadi hanya full-admin yang boleh memberikannya. Route berkas privat `/api/sensus/student-card/...` juga memakai modul `sensus` ini.
- **Data agregat** (tanpa PII) tetap di `/console/reports` untuk pemilik modul `reports`: statistik kelengkapan, tally universitas/jenjang/cabang, status keanggotaan. Generator unduhan **"Ringkasan Sensus"** (memuat nomor paspor) ikut butuh modul `sensus`; **"Ekspor Data Mahasiswa"** (tanpa paspor) tetap di `reports`. Lihat [Reports & Analytics](./Reports%20&%20Analytics.md) § Sensus Summary Report — pelaporan ini alasan utama data sensus dikumpulkan (rekap ke PPI Tiongkok pusat).
- **Ringkasan per-ranting** di `/console/ranting/sensus` untuk role `[INA]/[JIA] BPH Ranting` (key non-delegable **`sensus-ranting`**): daftar mahasiswa kampus ranting itu saja + status lengkap/belum + apakah kartu diunggah, plus **cari** + **Ekspor CSV** (kolom ringkas tanpa PII, `/api/console/sensus/export` mendeteksi tier ranting & memaksa filter kampus). Tanpa paspor, tanpa halaman detail, tanpa CRUD. Filter kampus lewat pencocokan `sensus_profiles.university` (lihat `src/lib/rantings.ts`; NUIST sudah dipetakan, JSAHVC masih TODO). `[INA]/[JIA] Anggota Ranting` = tanpa akses console. Role dikenali lewat namanya di `resolveAdminScope()` (`src/auth.ts`); di-seed `src/db/seed.ts` / `drizzle/0034_ranting_roles.sql`.
- **Verifikasi mahasiswa (terbatas)** di `/console/sensus` untuk pemegang modul **`sensus-verify`** yang TIDAK punya `sensus` penuh (mis. Divisi Humas kabinet). Halaman yang sama mengalihkan mereka ke `<SensusVerifyList>`: hanya **nama + kampus + status kelengkapan + foto bukti kartu mahasiswa / LOA**. Tanpa nomor paspor, kontak, kota, jurusan, ekspor, atau ubah/hapus. `sensus-verify` **delegable** (checkbox di `/console/organization`, bukan `SENSITIVE_SCOPE_KEYS`); mengalir lewat `adminModuleScope` biasa (tidak ada penanganan khusus di `resolveAdminScope`). Pemegang `sensus` penuh tidak terpengaruh.
- Migrasi `drizzle/0033_sensus_scope_split.sql` melepas `sensus` dari alias `reports` dan membersihkan grant lama.

## Catatan implementasi

Karena form ini panjang & bertahap, **simpan progres per-langkah** (bukan hanya submit di akhir) — `completion_status` di [Data Dictionary](./Data%20Dictionary.md) mendukung status `incomplete`, memungkinkan user melanjutkan nanti tanpa kehilangan data yang sudah diisi. React Hook Form + step-based state (lihat [Tech Stack](./Tech%20Stack.md)) cocok untuk pola ini.

### OCR paspor

Langkah Biodata dapat membaca dua baris MRZ paspor dari foto. Tesseract.js hanya dipakai untuk mengenali karakter; crop gambar, parsing TD3, perbaikan karakter yang sering tertukar, dan validasi checksum ICAO dikerjakan oleh kode proyek. Foto dan teks mentah tetap berada di browser, model dimuat dari origin situs, dan hasil tidak disimpan otomatis. Pengguna tetap harus membandingkan field yang terisi dengan paspor sebelum melanjutkan.

### Fitur terencana: OCR kartu mahasiswa

OCR kartu mahasiswa belum diaktifkan. Saat dikerjakan, pemrosesan teks harus berjalan di browser dan tidak boleh memakai layanan OCR pihak ketiga. Hasil OCR dicocokkan dengan daftar universitas cabang yang sudah dipilih melalui `findUniversityMatch()` di `src/lib/university-match.ts`; hasilnya hanya saran yang wajib dikonfirmasi pengguna. Berkas kartu mahasiswa yang diunggah disimpan sebagai Vercel Blob privat dan hanya dibaca melalui route yang memeriksa pemilik atau akses modul admin `sensus`.
