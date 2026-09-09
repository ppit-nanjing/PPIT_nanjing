-- Hak akses konsol Kegiatan per KEPANITIAAN acara (per-acara), bukan lagi hanya
-- per divisi kabinet. Lihat src/lib/event-access.ts + event-capabilities.ts.
--
-- Model: BPH Kabinet ("full") tembus semua · BPH Panitia (jabatan pelaksana
-- inti, otomatis dari role) pegang semua fitur acaranya · Panitia dapat fitur
-- DASAR + kapabilitas yang dicentang untuk DIVISI-nya.
--
-- Scan/pendataan BUKAN peran — itu salah satu kapabilitas grant di poin 1.
-- Peran enum "humas"/"acara"/"logistik"/"dokumentasi" yang sudah ada tetap
-- dipakai sebagai label posisi (tidak ada perubahan pada tipe enum).
--
-- 1) "granted_capabilities" di event_divisions — daftar kapabilitas khusus yang
--    dicentang BPH Panitia untuk divisi tsb (sertifikat, galeri, keuangan,
--    pinjam aset, post artikel, scan). NULL/[] = anggotanya hanya fitur dasar.
-- 2) "checked_in_by" di event_registrations & event_committee — akun petugas
--    yang men-scan, supaya kehadiran bisa ditelusuri ke orangnya.
-- 3) "event_id" di news_articles + tabel baru "event_credits" (arsip/LPJ).
--
-- Semua pernyataan MURNI MENAMBAH (ADD COLUMN nullable/berdefault, CREATE TABLE
-- baru) — tidak menyentuh data yang sudah ada, tidak menulis ulang tabel, tidak
-- menyentuh users/sensus_profiles. IF NOT EXISTS = idempoten. apply-sql.ts
-- menjalankan tiap pernyataan terpisah. Kolom uuid mengikuti pola
-- "payment_verified_by" (migrasi 0009).
--
-- Terapkan ke Neon: npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0032_event_rbac.sql

ALTER TABLE "event_divisions"
  ADD COLUMN IF NOT EXISTS "granted_capabilities" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "event_registrations"
  ADD COLUMN IF NOT EXISTS "checked_in_by" uuid REFERENCES "users"("id");

ALTER TABLE "event_committee"
  ADD COLUMN IF NOT EXISTS "checked_in_by" uuid REFERENCES "users"("id");

-- Artikel berita yang meliput sebuah acara — ditulis panitia lewat grant
-- "Post artikel" divisi. NULL = berita kabinet biasa.
ALTER TABLE "news_articles"
  ADD COLUMN IF NOT EXISTS "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL;

-- Kredit / arsip kepanitiaan (Spesifikasi §10) — daftar tampilan yang diisi
-- Sekretaris saat LPJ, TERPISAH dari event_committee (yang mengatur akses).
CREATE TABLE IF NOT EXISTS "event_credits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "display_name" text NOT NULL,
  "role_label" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);
