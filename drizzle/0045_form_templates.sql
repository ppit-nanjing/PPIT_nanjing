-- Migrasi 0041: Formulir template internal (pengganti Google Forms).
-- Satu template = satu formulir publik mandiri (mis. /recruitment,
-- /evaluation/committee). Pertanyaan disimpan sebagai JSON `sections`
-- supaya bisa diedit dari console tanpa ganti kode. Jawaban mengikuti field
-- id; unique (template_id, responder_token) mencegah isi dobel per perangkat
-- tanpa akun (pola event_evaluations / migrasi 0040).

CREATE TYPE "form_template_status" AS ENUM ('draft', 'published', 'closed');

CREATE TYPE "form_field_type" AS ENUM (
  'short_text', 'paragraph', 'email', 'tel', 'number', 'date',
  'select', 'radio', 'multiselect', 'scale', 'file'
);

CREATE TABLE IF NOT EXISTS "form_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "status" "form_template_status" NOT NULL DEFAULT 'draft',
  "sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "success_message" text,
  "notify_email" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "form_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "form_templates"("id") ON DELETE CASCADE,
  "answers" jsonb NOT NULL,
  "responder_token" text NOT NULL,
  "submitter_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed" boolean NOT NULL DEFAULT false,
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "internal_note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "form_submissions_template_token_idx"
  ON "form_submissions" ("template_id", "responder_token");
