-- Migrasi 0046: Evaluasi panitia per-acara (kolektif, dengan jendela waktu).
-- Pengisi = panitia acara itu (login, ada di event_committee), satu jawaban
-- per pengisi per acara (unique event_id+user_id). Jendela buka/tutup disimpan
-- sebagai dua kolom di tabel events (satu acara satu jendela) — status jendela
-- dihitung dari waktu saat ini, tanpa cron. Pertanyaan tetap (placeholder)
-- tinggal di src/lib/committee-evaluation.ts; sifat penilaian KOLEKTIF
-- (divisi/kepanitiaan secara keseluruhan), bukan skor per orang.

ALTER TABLE "events"
  ADD COLUMN "committee_eval_opens_at" timestamp,
  ADD COLUMN "committee_eval_closes_at" timestamp;

CREATE TABLE IF NOT EXISTS "event_committee_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL,
  "rating_coordination" integer NOT NULL,
  "rating_teamwork" integer NOT NULL,
  "rating_communication" integer NOT NULL,
  "rating_workload" integer NOT NULL,
  "rating_satisfaction" integer NOT NULL,
  "went_well" text NOT NULL,
  "to_improve" text NOT NULL,
  "feedback" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_committee_evaluations_unique"
  ON "event_committee_evaluations" ("event_id", "user_id");