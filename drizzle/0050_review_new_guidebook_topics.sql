-- Menandai 8 topik guidebook maba gelombang kedua sebagai sudah ditinjau,
-- supaya chatbot bisa mengutipnya (gerbangnya: is_public AND reviewed_at NOT
-- NULL). Isinya sumber resmi yang sama dengan gelombang pertama: buku "A Guide
-- to Nanjing" 2026 dan deck Nanjing 101, jadi penanda tinjauan di sini berarti
-- "lolos korpus resmi", bukan "belum dicek manusia". Idempoten: baris yang
-- sudah ditinjau tidak disentuh, topik lain tidak ikut.
--
-- Jalankan: npx tsx --env-file=.env.local src/db/apply-sql.ts drizzle/0050_review_new_guidebook_topics.sql
UPDATE "help_articles"
SET "reviewed_at" = now()
WHERE "slug" IN (
  'transportasi-dalam-kota',
  'kuliner-dan-tempat-makan',
  'kesehatan-dan-darurat',
  'musim-dan-cuaca',
  'nomor-penting-dan-kontak',
  'spot-wisata-dan-rekreasi',
  'perpanjangan-paspor-dan-skb',
  'bahasa-mandarin-sehari-hari'
)
AND "reviewed_at" IS NULL;
