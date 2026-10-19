-- Migrasi 0052 — Kadiv (Ketua Divisi) acara + Oprek Kadiv.
--
-- * event_committee_role += 'kadiv': ketua satu divisi acara. Akses acaranya
--   sama dengan panitia biasa (fitur dasar + grant divisinya); hak tambahannya
--   hanya di modul Formulir: mengelola & memutuskan Oprek anggota acaranya.
-- * form_kind += 'oprek_kadiv': rekrutmen Kadiv per divisi (pilihan divisi 1/2),
--   dibuat & diputuskan BPH Acara. Index unik (kind, event_id) dari 0050 ikut
--   berlaku: satu acara satu Oprek Kadiv.
--
-- ADD VALUE tidak bisa di dalam transaksi yang sama dengan pemakaiannya;
-- apply-sql menjalankan tiap pernyataan terpisah. Aman dijalankan ulang
-- (IF NOT EXISTS). Nilai baru ditaruh di akhir enum (urutan di schema.ts sama).
ALTER TYPE "event_committee_role" ADD VALUE IF NOT EXISTS 'kadiv';
ALTER TYPE "form_kind" ADD VALUE IF NOT EXISTS 'oprek_kadiv';
