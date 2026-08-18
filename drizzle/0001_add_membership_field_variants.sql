-- Adds new membership form field types (radio / multiselect / rating) and a
-- jsonb config column for per-type settings (e.g. rating scale bounds).
-- Minimal/incremental so it applies on top of the existing database.

ALTER TYPE "public"."membership_field_type" ADD VALUE IF NOT EXISTS 'radio';
ALTER TYPE "public"."membership_field_type" ADD VALUE IF NOT EXISTS 'multiselect';
ALTER TYPE "public"."membership_field_type" ADD VALUE IF NOT EXISTS 'rating';

ALTER TABLE "public"."membership_form_fields" ADD COLUMN IF NOT EXISTS "config" jsonb;
