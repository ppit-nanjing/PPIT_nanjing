-- Superseded the previous "one style for the whole description" columns
-- (description_font/description_font_size/description_font_weight, added
-- 0039) with a real rich-text field: bold/italic/align/font/size now apply
-- per selected range via a TipTap editor, not globally per event. Only
-- fun-hike-pinyx-2026 ever had those columns set, and it was reset back to
-- null before this superseding feature shipped, so nothing is lost.

ALTER TABLE "events" DROP COLUMN IF EXISTS "description_font";
ALTER TABLE "events" DROP COLUMN IF EXISTS "description_font_size";
ALTER TABLE "events" DROP COLUMN IF EXISTS "description_font_weight";
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description_html" text;
