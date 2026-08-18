-- Adds a 'section' field type used as a form heading/divider ("tahap" / bagian)
-- so the membership form can be grouped into logical steps instead of one wall
-- of questions. Applied on top of the existing database.

ALTER TYPE "public"."membership_field_type" ADD VALUE IF NOT EXISTS 'section';
