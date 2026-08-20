-- 9 kota naungan PPIT Nanjing. Terpisah dari regional_branches (32 cabang PPI
-- nasional) karena keduanya konsep berbeda dan lintas provinsi.
CREATE TABLE IF NOT EXISTS "coverage_cities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "member_count" integer,
  "contact_info" text,
  "note" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
