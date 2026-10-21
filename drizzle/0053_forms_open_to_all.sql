-- Migrasi 0053 — form Oprek yang boleh diisi semua akun yang login.
--
-- Default false: semua form lama tetap khusus pengurus kabinet PPIT Nanjing
-- (Struktur Organisasi). Dinyalakan per form dari Setelan untuk acara lintas
-- cabang (mis. SKR) yang pelamarnya bisa dari PPIT lain. Pemilu diabaikan
-- (selalu khusus kabinet; ditegakkan canFillForm di src/lib/form-access.ts).
-- Aman dijalankan ulang (IF NOT EXISTS).
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "open_to_all_accounts" boolean NOT NULL DEFAULT false;
