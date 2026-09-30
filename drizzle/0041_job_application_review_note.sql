-- Internal reviewer note on a job application (admin console, module "career").
-- Never shown to the applicant. Nullable + additive, so existing rows and the
-- already-live /jobs apply flow are unaffected.

ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "review_note" text;
