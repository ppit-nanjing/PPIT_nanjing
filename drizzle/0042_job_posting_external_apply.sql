-- Optional external apply link per job posting (/jobs). NULL keeps the existing
-- behaviour (apply through the PPIT form). external_clicks counts members who
-- follow the link, the only metric available since those applications never
-- reach PPIT. Both additive: nullable / defaulted, existing rows unaffected.

ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "apply_url" text;
ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "external_clicks" integer NOT NULL DEFAULT 0;
