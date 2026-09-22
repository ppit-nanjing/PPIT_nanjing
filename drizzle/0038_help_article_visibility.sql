-- Artikel Help Center (help_articles) sekarang bisa ditandai boleh tampil di
-- halaman publik /help, bukan cuma di console.
--
-- Default false: semua artikel yang sudah ada adalah panduan operasional
-- console (ditulis buat pengurus), bukan buat anggota umum - jadi tetap
-- tertutup sampai ada yang sengaja menyalakannya lewat form edit artikel.

ALTER TABLE "help_articles" ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT false;
