-- Panitia acara (work ledger), sertifikat, dan verifikasi pembayaran.
-- Menutup item "Work Ledger", "Daftar jadi panitia + sertifikat", dan
-- "Verifikasi Pembayaran" dari dokumen Website Ideas.

DO $$ BEGIN
  CREATE TYPE "event_committee_role" AS ENUM
    ('ketua','wakil','sekretaris','bendahara','humas','acara','logistik','dokumentasi','anggota');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "certificate_kind" AS ENUM ('peserta','panitia','pemateri','lainnya');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('not_required','unpaid','submitted','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "event_committee" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "event_committee_role" NOT NULL DEFAULT 'anggota',
  "note" text,
  "assigned_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_committee_unique"
  ON "event_committee" ("event_id", "user_id");

CREATE TABLE IF NOT EXISTS "certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
  "kind" "certificate_kind" NOT NULL DEFAULT 'peserta',
  "title" text NOT NULL,
  "file_url" text,
  "issued_at" timestamp NOT NULL DEFAULT now(),
  "issued_by" uuid REFERENCES "users"("id")
);

ALTER TABLE "event_registrations"
  ADD COLUMN IF NOT EXISTS "payment_status" "payment_status" NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS "payment_proof_url" text,
  ADD COLUMN IF NOT EXISTS "payment_note" text,
  ADD COLUMN IF NOT EXISTS "payment_verified_at" timestamp,
  ADD COLUMN IF NOT EXISTS "payment_verified_by" uuid REFERENCES "users"("id");

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "fee_cny" integer,
  ADD COLUMN IF NOT EXISTS "payment_instructions" text;
