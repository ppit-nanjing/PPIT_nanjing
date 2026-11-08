-- Menandai 7 dari 9 topik guidebook maba sebagai sudah ditinjau, supaya
-- chatbot bisa mengutipnya (gerbangnya: is_public AND reviewed_at NOT NULL).
-- Isinya sumber resmi yang sudah melewati proses PDF pusat (buku "A Guide to
-- Nanjing" 2026 + deck Nanjing 101). Dua topik sengaja dibiarkan menunggu
-- tinjauan pengurus karena menyangkut izin tinggal dan berkas kedatangan:
-- 'visa-dan-izin-tinggal' dan 'dokumen-dan-berkas-awal-datang'. Idempoten:
-- baris yang sudah ditinjau tidak disentuh, dan topik non-guidebook (console)
-- tidak ikut.
UPDATE "help_articles"
SET "reviewed_at" = now()
WHERE "slug" IN (
  'transportasi-dari-bandara-ke-kampus-uvd9',
  'profil-ppit-tiongkok',
  'profil-ppit-nanjing',
  'kota-nanjing',
  'aplikasi-pembayaran-dan-sim-card',
  'tempat-tinggal-asrama-dan-kos',
  'biaya-hidup-bulan-pertama'
)
AND "reviewed_at" IS NULL;
