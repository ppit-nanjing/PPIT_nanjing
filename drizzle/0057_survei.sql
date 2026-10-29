-- Migrasi 0057 — Survei: formulir kustom ala Google Forms (riset pasar, kuesioner, dll.).
--
-- * form_kind += 'survei'. Survei memakai tabel forms + form_fields yang sama dengan
--   Oprek/Pemilu, jadi builder pertanyaannya dipakai ulang. Bedanya: boleh tanpa
--   acara (survei kabinet) ATAU terikat satu acara, dan SATU acara boleh punya
--   BANYAK survei.
-- * forms.allow_public: survei boleh diisi tanpa login (default false = wajib login).
-- * forms.collect_biodata: survei meminta biodata responden (nama, kampus, kota).
--   Yang sudah sensus lengkap diambil dari sensus, selebihnya diisi manual.
-- * Index unik (kind, event_id) dari 0050 (satu acara satu form per jenis) dilonggarkan:
--   survei dikecualikan.
-- * form_responses: jawaban survei. Terpisah dari form_applications yang khusus
--   lamaran Oprek/Pemilu (status, penempatan panitia, wajib login).
--
-- ADD VALUE tidak bisa dipakai di transaksi yang sama dengan pemakaiannya (index
-- di bawah memakai nilai barunya); apply-sql menjalankan tiap pernyataan terpisah.
-- Aman dijalankan ulang. Nilai baru ditaruh di akhir enum (urutan di schema.ts sama).
ALTER TYPE "form_kind" ADD VALUE IF NOT EXISTS 'survei';

ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "allow_public" boolean NOT NULL DEFAULT false;

ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "collect_biodata" boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "forms_kind_event_unique_idx";

CREATE UNIQUE INDEX "forms_kind_event_unique_idx" ON "forms" USING btree ("kind", "event_id") WHERE "event_id" IS NOT NULL AND "kind" <> 'survei';

CREATE TABLE IF NOT EXISTS "form_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "biodata" jsonb,
  "biodata_source" text,
  "answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "submitted_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_responses_form_user_idx" ON "form_responses" USING btree ("form_id", "user_id") WHERE "user_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "form_responses_form_idx" ON "form_responses" USING btree ("form_id", "submitted_at");
