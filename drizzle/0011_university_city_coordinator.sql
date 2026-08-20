-- Universitas dikelompokkan per kota (9 kota naungan), bukan per distrik Nanjing.
-- Koordinator diisi pengurus.
ALTER TABLE "universities"
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "coordinator_name" text,
  ADD COLUMN IF NOT EXISTS "coordinator_email" text;
