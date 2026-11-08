-- Migrasi 0060 — pilihan hadir online/offline per acara (mis. NYALA).
--
-- events.offers_attendance_mode: saklar. NYALA = form pendaftaran menanyakan
-- "Online atau Offline?" (wajib) dan tiket menampilkan QR grup yang cocok.
-- events.group_qr_online_url / group_qr_offline_url: gambar QR grup (blob).
-- event_registrations.attendance_mode: jawaban peserta, 'online' | 'offline'.
-- NULL = acara tanpa pilihan itu atau pendaftaran lama. Tidak ada backfill.
--
-- Jalankan SEBELUM kode yang membaca kolom ini ter-deploy, karena setiap query
-- `select *` dari events / event_registrations membacanya (npm run check:drift).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "offers_attendance_mode" boolean NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "group_qr_online_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "group_qr_offline_url" text;
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "attendance_mode" text;
