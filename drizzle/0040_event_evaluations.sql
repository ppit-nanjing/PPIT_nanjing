-- Migrasi 0040: evaluasi acara pasca-acara (WIF 2026 X CGT).
-- Satu baris = satu respons per perangkat; unique (event_id, responder_token)
-- mencegah isi dobel tanpa akun. Identitas opsional (anonymous flag).

CREATE TABLE IF NOT EXISTS "event_evaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "rating_registration" integer NOT NULL,
  "rating_facilities" integer NOT NULL,
  "rating_cgt" integer NOT NULL,
  "rating_overall" integer NOT NULL,
  "improve_registration" text,
  "improve_facilities" text,
  "cgt_message" text,
  "improve_service" text,
  "overall_message" text,
  "heartwarming" text,
  "respondent_name" text,
  "respondent_city" text,
  "anonymous" boolean NOT NULL DEFAULT false,
  "responder_token" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_evaluations_event_token_idx"
  ON "event_evaluations" ("event_id", "responder_token");
