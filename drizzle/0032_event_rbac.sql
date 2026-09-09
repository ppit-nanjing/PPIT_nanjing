-- Hak akses konsol Kegiatan per KEPANITIAAN acara (per-acara), bukan lagi hanya
-- per divisi kabinet. Lihat src/lib/event-access.ts + event-capabilities.ts.
--
-- Model: BPH Kabinet ("full") tembus semua · BPH Panitia (jabatan pelaksana
-- inti, otomatis dari role) pegang semua fitur acaranya · Panitia dapat fitur
-- DASAR + kapabilitas yang dicentang untuk DIVISI-nya.
--
-- 1) Peran baru "pendataan" (label jabatan; scan kini kapabilitas grant, bukan
--    peran). Nilai enum "humas"/"acara"/"logistik"/"dokumentasi" yang dulu
--    ditandai mati kini dipakai sebagai label posisi/divisi — tidak ada
--    perubahan skema, hanya makna.
-- 2) "granted_capabilities" di event_divisions — daftar kapabilitas khusus yang
--    dicentang BPH Panitia untuk divisi tsb (sertifikat, galeri, keuangan,
--    pinjam aset, post artikel, scan). NULL/[] = anggotanya hanya fitur dasar.
-- 3) "checked_in_by" di event_registrations & event_committee — akun petugas
--    yang men-scan, supaya kehadiran bisa ditelusuri ke orangnya.
--
-- ALTER TYPE ... ADD VALUE hanya MENAMBAH; aman di produksi. IF NOT EXISTS =
-- idempoten. Postgres menuntut ADD VALUE berdiri sendiri di luar blok
-- transaksi; apply-sql.ts menjalankan tiap pernyataan terpisah. Kolom uuid
-- mengikuti pola "payment_verified_by" (migrasi 0009).
--
-- Terapkan ke Neon: npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0032_event_rbac.sql

ALTER TYPE "event_committee_role" ADD VALUE IF NOT EXISTS 'pendataan';

ALTER TABLE "event_divisions"
  ADD COLUMN IF NOT EXISTS "granted_capabilities" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "event_registrations"
  ADD COLUMN IF NOT EXISTS "checked_in_by" uuid REFERENCES "users"("id");

ALTER TABLE "event_committee"
  ADD COLUMN IF NOT EXISTS "checked_in_by" uuid REFERENCES "users"("id");
