-- Suara pengguna (suka/tidak suka) atas satu jawaban chatbot, dipakai untuk
-- KPI kualitas jawaban di docs/Guidebook Maba.md. Aditif: satu enum + satu
-- kolom nullable di ai_query_log, jadi rollback aplikasi tidak butuh DROP.
-- Baris lama (dan jawaban yang belum dinilai) tetap NULL.
--
-- CREATE TYPE-nya sengaja tanpa blok DO ... EXCEPTION seperti di 0008/0009:
-- src/db/apply-sql.ts memecah berkas per ";" di akhir baris, jadi DO block di
-- situ terkirim setengah pernyataan. Gaya yang bisa dijalankan script itu
-- dipakai di 0025, dan migrasi ini mengikutinya.
CREATE TYPE "ai_feedback_vote" AS ENUM ('up', 'down');

ALTER TABLE "ai_query_log" ADD COLUMN IF NOT EXISTS "feedback" "ai_feedback_vote";

-- KPI "jawaban terburuk" membaca baris yang dinilai tidak suka, jadi indeksnya
-- parsial: baris NULL (belum dinilai) tidak perlu ikut.
CREATE INDEX IF NOT EXISTS "ai_query_log_feedback_idx" ON "ai_query_log" ("feedback") WHERE "feedback" IS NOT NULL;
