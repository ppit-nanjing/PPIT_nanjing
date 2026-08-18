-- Extend membership form settings ("Setelan"): quiz mode, presentation, defaults, spreadsheet link.
ALTER TABLE "membership_form_meta"
  ADD COLUMN IF NOT EXISTS "is_quiz" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "collect_email" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "shuffle" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_progress" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "default_required" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "spreadsheet_url" text;
