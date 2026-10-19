-- Migrasi 0049 — modul "Formulir": Pemilu, Oprek BPH Acara, Oprek Kepanitiaan.
--
-- Konteks: dulu pernah ada modul "Formulir generik" (form_templates/
-- form_submissions, branch feat/forms-and-evaluasi-panitia) yang dibuang
-- sebelum rilis; sisa tabel + enum-nya sudah dibersihkan oleh
-- drizzle/0047_drop_unused_form_tables.sql. Modul di bawah ini arahnya beda:
-- formulir INTERNAL KABINET (wajib login + baris di Struktur Organisasi),
-- form Oprek terikat satu acara, dan keputusan diterima otomatis menulis
-- penugasan ke event_committee. Dokumentasi: docs/Formulir & Oprek.md.
--
-- Semua pernyataan aditif; tidak mengubah tabel yang sudah ada. Ditulis
-- satu pernyataan per baris agar aman dijalankan src/db/apply-sql.ts
-- (pemisahnya `;\s*$`, tanpa blok DO $$).

CREATE TYPE "form_kind" AS ENUM ('pemilu', 'oprek_bph_acara', 'oprek_kepanitiaan');

CREATE TYPE "form_application_status" AS ENUM ('pending', 'accepted', 'accepted_choice1', 'accepted_choice2', 'reassigned', 'rejected');

CREATE TABLE "forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" "form_kind" NOT NULL,
  "event_id" uuid REFERENCES "events"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "is_open" boolean NOT NULL DEFAULT false,
  "opens_at" timestamp,
  "closes_at" timestamp,
  "confirmation_message" text NOT NULL DEFAULT 'Terima kasih! Jawabanmu sudah kami terima.',
  "bph_roles" text[] NOT NULL DEFAULT '{}',
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "forms_kind_idx" ON "forms" ("kind");

CREATE INDEX "forms_event_idx" ON "forms" ("event_id");

CREATE TABLE "form_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "type" "membership_field_type" NOT NULL DEFAULT 'text',
  "placeholder" text,
  "help_text" text,
  "required" boolean NOT NULL DEFAULT false,
  "options" text,
  "config" jsonb,
  "order_index" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "form_fields_form_key_idx" ON "form_fields" ("form_id", "key");

CREATE TABLE "form_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" uuid NOT NULL REFERENCES "forms"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "cabinet_division" text NOT NULL,
  "position_applied" text,
  "choice1_division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL,
  "choice2_division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL,
  "assigned_division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL,
  "assigned_role" "event_committee_role",
  "status" "form_application_status" NOT NULL DEFAULT 'pending',
  "note" text,
  "responses" jsonb,
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "reviewed_at" timestamp
);

CREATE UNIQUE INDEX "form_applications_form_user_idx" ON "form_applications" ("form_id", "user_id");

CREATE INDEX "form_applications_form_idx" ON "form_applications" ("form_id", "submitted_at");

CREATE TABLE "event_responsible_departments" (
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("event_id", "department_id")
);
