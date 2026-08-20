-- Konten kota (Places, Universities, Districts) + Catalogue (merchandise,
-- sponsors, donations). Sejajar dengan yang dipunyai PPIT Chongqing di menu
-- "Discover" dan "Catalogue" — lihat docs/Perbandingan dengan PPIT Chongqing.md.

DO $$ BEGIN
  CREATE TYPE "place_category" AS ENUM ('tourism', 'spiritual', 'practical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "merchandise_status" AS ENUM ('available', 'preorder', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "sponsor_tier" AS ENUM ('platinum', 'gold', 'silver', 'partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "donation_status" AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "places" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "name_zh" text,
  "category" "place_category" NOT NULL DEFAULT 'tourism',
  "district" text,
  "description" text,
  "address" text,
  "address_zh" text,
  "image_url" text,
  "map_url" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "universities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "name_zh" text,
  "abbreviation" text,
  "district" text,
  "description" text,
  "website_url" text,
  "logo_url" text,
  "student_count" integer,
  "is_partner" boolean NOT NULL DEFAULT false,
  "order_index" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "districts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "name_zh" text,
  "description" text,
  "order_index" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "merchandise" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "price_cny" integer,
  "image_url" text,
  "status" "merchandise_status" NOT NULL DEFAULT 'unavailable',
  "contact_note" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "tier" "sponsor_tier" NOT NULL DEFAULT 'partner',
  "logo_url" text,
  "website_url" text,
  "description" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "donations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id"),
  "donor_name" text NOT NULL,
  "amount_cny" integer,
  "method" text,
  "message" text,
  "proof_url" text,
  "anonymous" boolean NOT NULL DEFAULT false,
  "status" "donation_status" NOT NULL DEFAULT 'pending',
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "verified_at" timestamp
);

CREATE TABLE IF NOT EXISTS "donation_channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" text NOT NULL,
  "account_name" text,
  "account_detail" text,
  "qr_image_url" text,
  "instructions" text,
  "order_index" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT true
);
