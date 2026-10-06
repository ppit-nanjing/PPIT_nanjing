-- Migrasi 0044: pertanyaan evaluasi acara yang dibuat panitia sendiri.
-- Acara tanpa baris di event_evaluation_questions tetap memakai template tetap
-- (WIF / umum) dan kolom bawaan event_evaluations, jadi data lama tidak berubah.
-- Acara dengan pertanyaan sendiri menyimpan jawaban di event_evaluation_answers.
-- Aman dijalankan ulang (IF NOT EXISTS, DROP NOT NULL idempoten).

CREATE TABLE IF NOT EXISTS "event_evaluation_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "type" text NOT NULL,
  "options" text,
  "required" boolean NOT NULL DEFAULT true,
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "event_evaluation_questions_type_check"
    CHECK ("type" IN ('rating', 'text', 'textarea', 'select', 'radio', 'multiselect'))
);

CREATE INDEX IF NOT EXISTS "event_evaluation_questions_event_idx"
  ON "event_evaluation_questions" ("event_id", "order_index");

-- Satu baris = jawaban satu pertanyaan dalam satu respons. question_label dan
-- question_type adalah salinan saat dijawab: menghapus pertanyaan (question_id
-- jadi NULL) tidak menghilangkan jawaban yang sudah terkumpul.
CREATE TABLE IF NOT EXISTS "event_evaluation_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "evaluation_id" uuid NOT NULL REFERENCES "event_evaluations"("id") ON DELETE CASCADE,
  "question_id" uuid REFERENCES "event_evaluation_questions"("id") ON DELETE SET NULL,
  "question_label" text NOT NULL,
  "question_type" text NOT NULL,
  "value_text" text,
  "value_number" integer
);

CREATE INDEX IF NOT EXISTS "event_evaluation_answers_evaluation_idx"
  ON "event_evaluation_answers" ("evaluation_id");

CREATE INDEX IF NOT EXISTS "event_evaluation_answers_question_idx"
  ON "event_evaluation_answers" ("question_id");

-- Respons dengan pertanyaan sendiri tidak mengisi 4 penilaian bawaan. Kolom
-- teks bawaan sudah boleh NULL. Baris lama tetap terisi penuh.
ALTER TABLE "event_evaluations" ALTER COLUMN "rating_registration" DROP NOT NULL;

ALTER TABLE "event_evaluations" ALTER COLUMN "rating_facilities" DROP NOT NULL;

ALTER TABLE "event_evaluations" ALTER COLUMN "rating_cgt" DROP NOT NULL;

ALTER TABLE "event_evaluations" ALTER COLUMN "rating_overall" DROP NOT NULL;
