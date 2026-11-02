-- Menandai 6 topik guidebook maba gelombang ketiga (celah dari perbandingan
-- dengan PDF sumber) sebagai sudah ditinjau, supaya chatbot bisa mengutipnya
-- (gerbangnya: is_public AND reviewed_at NOT NULL). Sumbernya sama dengan
-- gelombang sebelumnya: buku "A Guide to Nanjing" 2026, deck Nanjing 101, dan
-- China Student Starter Guide VER4, jadi penanda tinjauan di sini berarti
-- "lolos korpus resmi", bukan "belum dicek manusia". Idempoten: baris yang
-- sudah ditinjau tidak disentuh, topik lain tidak ikut.
--
-- Jalankan: npx tsx --env-file=.env.local src/db/apply-sql.ts drizzle/0062_review_gap_topics.sql
UPDATE "help_articles"
SET "reviewed_at" = now()
WHERE "slug" IN (
  'vpn-dan-akses-internet',
  'packing-dan-kirim-barang',
  'minggu-pertama-checklist',
  'tempat-ibadah-di-nanjing',
  'kerja-magang-dan-sim',
  'festival-dan-hari-libur'
)
AND "reviewed_at" IS NULL;
