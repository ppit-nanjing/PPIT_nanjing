-- Warna halaman acara (opsional). Semua null = tema situs seperti biasa.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "theme_bg" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "theme_accent" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "theme_accent_2" text;
