-- Form pendaftaran WIF: biodata peserta + tarif bertingkat + unggah berkas (LOA).
--
-- 1. Tipe pertanyaan `file` untuk event_questions (bukti mahasiswa aktif dsb).
-- 2. Tabel event_fee_options: kategori tarif per-acara (Freshmen ¥15 /
--    Non-freshmen ¥25 untuk WIF; satu baris flat untuk booth Wonders).
-- 3. event_registrations.fee_option_id: kategori yang dipilih peserta.
-- 4. events.requires_biodata + event_registrations.biodata_json: snapshot
--    biodata lengkap peserta, diambil dari sensus bila lengkap.

ALTER TYPE "event_question_type" ADD VALUE IF NOT EXISTS 'file';

CREATE TABLE IF NOT EXISTS "event_fee_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "amount_cny" integer NOT NULL,
  "order_index" integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "event_fee_options_event_id_idx" ON "event_fee_options" ("event_id");

ALTER TABLE "event_registrations"
  ADD COLUMN IF NOT EXISTS "fee_option_id" uuid REFERENCES "event_fee_options"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "biodata_json" jsonb;

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "requires_biodata" boolean NOT NULL DEFAULT false;
