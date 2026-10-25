-- Migrasi 0056 — dua saklar per acara untuk sertifikat dan evaluasi peserta.
--
-- certificate_requires_attendance: TRUE (bawaan, aturan lama) = sertifikat
-- peserta hanya untuk yang tercatat hadir lewat QR DAN sudah mengisi evaluasi
-- dengan akun. FALSE = acara tanpa absen QR (mis. Nanjing Diaries): cukup yang
-- terdaftar (terkonfirmasi) DAN sudah mengisi evaluasi dengan akun.
--
-- evaluation_allows_anonymous: TRUE (bawaan, perilaku lama) = ada kotak "kirim
-- sebagai anonim" di form evaluasi peserta. FALSE = evaluasi selalu atas nama.
--
-- Hanya menambah kolom dengan nilai bawaan TRUE, jadi semua acara yang ada
-- berperilaku persis seperti sebelumnya. Aman dijalankan ulang. Jalankan SEBELUM
-- kode yang membaca kolom ini ter-deploy.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "certificate_requires_attendance" boolean NOT NULL DEFAULT true;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "evaluation_allows_anonymous" boolean NOT NULL DEFAULT true;
