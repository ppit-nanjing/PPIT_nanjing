-- Migrasi 0062 — saklar per acara untuk pertanyaan "Kamu dari cabang PPI mana?".
--
-- ask_branch: TRUE (bawaan, perilaku lama) = form pendaftaran menanyakan cabang
-- PPI ke peserta yang sensusnya belum lengkap. FALSE = pertanyaan itu tidak
-- muncul sama sekali (mis. NYALA, yang terbuka untuk umum).
--
-- Hanya menambah kolom dengan nilai bawaan TRUE, jadi semua acara yang ada
-- berperilaku persis seperti sebelumnya. Aman dijalankan ulang. Jalankan SEBELUM
-- kode yang membaca kolom ini ter-deploy.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ask_branch" boolean NOT NULL DEFAULT true;
