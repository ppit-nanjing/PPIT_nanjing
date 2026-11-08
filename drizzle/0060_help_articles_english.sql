-- Terjemahan Inggris untuk halaman publik /help. Diisi script ingest dari
-- berkas docs/guidebook/en/*.md; null = belum ada terjemahan, halaman jatuh
-- ke teks Indonesia. Aditif dan nullable, jadi rollback aplikasi tidak butuh
-- DROP.
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "section_en" text;
ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "content_en" text;
