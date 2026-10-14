-- Rich text artikel berita disimpan terpisah dari teks polos `content`.
-- Tidak ada backfill: null membuat artikel lama tetap melalui renderer teks
-- lama sampai artikel tersebut diedit dan disimpan kembali.
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "content_html" text;
