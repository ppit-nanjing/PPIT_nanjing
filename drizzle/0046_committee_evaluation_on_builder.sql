-- Migrasi 0046 — Evaluasi panitia per-acara di atas builder pertanyaan evaluasi.
--
-- Evaluasi panitia kolektif tidak lagi memakai tabel lima-kolom-tetap
-- (event_committee_evaluations, lihat 0047 untuk penghapusannya). Ia kini
-- menulis ke tabel evaluasi yang sama dengan peserta (event_evaluations +
-- event_evaluation_answers) dan dibedakan lewat kolom `audience`:
--   - "peserta" (default): respons peserta acara — perilaku lama tak berubah.
--   - "panitia": respons kolektif panitia; pengisi wajib login + tercatat di
--     event_committee, jendela pengisian diatur di events.committee_eval_*.
-- Pertanyaannya disusun BPH lewat builder "Pertanyaan Evaluasi" di konsol
-- (tab Panitia) — pola sama dengan pertanyaan peserta (PR #74).
--
-- Idempoten (aman diulang): ADD COLUMN IF NOT EXISTS dan DROP CONSTRAINT IF
-- EXISTS. Kolom jendela di events sudah pernah dibuat di produksi, jadi di
-- sana dua pernyataan pertama menjadi no-op; di database baru mereka tetap
-- benar. Satu pernyataan per ";" di akhir baris (dijalankan lewat apply-sql).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "committee_eval_opens_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "committee_eval_closes_at" timestamp;
ALTER TABLE "event_evaluation_questions" ADD COLUMN IF NOT EXISTS "audience" text NOT NULL DEFAULT 'peserta';
ALTER TABLE "event_evaluation_questions" DROP CONSTRAINT IF EXISTS "event_evaluation_questions_audience_check";
ALTER TABLE "event_evaluation_questions" ADD CONSTRAINT "event_evaluation_questions_audience_check" CHECK ("audience" IN ('peserta', 'panitia'));
ALTER TABLE "event_evaluations" ADD COLUMN IF NOT EXISTS "audience" text NOT NULL DEFAULT 'peserta';
ALTER TABLE "event_evaluations" DROP CONSTRAINT IF EXISTS "event_evaluations_audience_check";
ALTER TABLE "event_evaluations" ADD CONSTRAINT "event_evaluations_audience_check" CHECK ("audience" IN ('peserta', 'panitia'));
ALTER TABLE "event_evaluations" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "event_evaluations" ADD COLUMN IF NOT EXISTS "division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "event_evaluations_committee_user_idx" ON "event_evaluations" ("event_id", "user_id") WHERE "audience" = 'panitia';
