-- Wajah pasca-acara halaman event: kehadiran nyata + dokumentasi. Semua opsional,
-- panitia isi belakangan. `final_attendee_count` null = pakai angka terdaftar
-- seperti biasa; `attendance_note` untuk rincian bebas ("80 online · 40 offline");
-- `recap_video_url` tautan rekaman/recap (tidak di-embed, hanya tombol keluar).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "final_attendee_count" integer;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "attendance_note" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "recap_video_url" text;
