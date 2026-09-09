-- Field tambahan dari form "Sensus PPIT Nanjing" (formulir chapter, versi
-- 2025-2026). Form PPI Tiongkok pusat tidak memintanya. Ditambahkan 2026-09-06.
--
-- Kolom dibuat nullable: baris sensus lama tidak punya nilainya dan tidak ada
-- backfill. Kewajiban ditegakkan di level aplikasi (src/lib/sensus-form.ts
-- REQUIRED_BY_STEP) — sebagian field ini (medium_of_instruction,
-- mandarin_ability, active_email, emergency_contact, china_address) wajib untuk
-- status "complete"; mandarin_name tetap opsional. Rekap ke PPI Tiongkok pusat
-- hanya membaca kolom milik form pusat.
--
-- Aman dijalankan berulang (ADD COLUMN IF NOT EXISTS), tidak ada backfill,
-- tidak ada constraint — murni aditif.

ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "mandarin_name" text;
ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "medium_of_instruction" text;
ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "mandarin_ability" text;
ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "active_email" text;
ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "emergency_contact" text;
ALTER TABLE "sensus_profiles" ADD COLUMN IF NOT EXISTS "china_address" text;
