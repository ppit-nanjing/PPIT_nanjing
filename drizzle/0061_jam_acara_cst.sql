-- Koreksi data sekali jalan: jam acara yang disimpan dari web live sebelum
-- perbaikan zona waktu (branch fix/jam-acara-cst).
--
-- Dulu form membaca jam yang diketik lewat `new Date(value)` di server Vercel
-- (UTC), jadi "16.00" tersimpan sebagai 16.00 UTC = 00.00 jam Tiongkok hari
-- berikutnya. Kode baru membaca jam yang diketik sebagai jam Tiongkok, jadi
-- baris lama perlu dimundurkan 8 jam supaya maknanya sama.
--
-- Daftar di bawah diambil dari database produksi pada 2026-11-11 dan dicek satu
-- per satu: jam "publik" (UTC) yang masuk akal, jam konsol tidak (mis. Fun Hike
-- 17.00-22.00, WIF 21.00-02.00, jadwal rilis jam 00.00/04.00).
--
-- Jalankan SEKALI, tepat setelah perbaikan kodenya ter-deploy:
--   npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0061_jam_acara_cst.sql
-- Aman bila tidak sengaja dijalankan dua kali: tiap baris hanya diubah kalau
-- jam mulainya masih persis nilai lama, jadi jalan kedua tidak mengubah apa pun.

UPDATE events AS e SET
  start_at = e.start_at - interval '8 hours',
  end_at = e.end_at - interval '8 hours',
  registration_deadline = e.registration_deadline - interval '8 hours',
  early_bird_until = e.early_bird_until - interval '8 hours',
  scheduled_publish_at = e.scheduled_publish_at - interval '8 hours'
FROM (VALUES
  ('00093a36', timestamp '2026-12-05 13:00'), -- NYALA (Navigate Your Future and Lead Ahead)
  ('04f0a3a9', timestamp '2026-11-14 16:00'), -- Nanjing Culinary Challenge 2026 (salinan draf yang sudah dihapus)
  ('bc3dbf30', timestamp '2026-11-14 16:00'), -- Nanjing Culinary Challenge 2026
  ('f5629984', timestamp '2026-10-25 13:00'), -- Nanjing Diaries
  ('333e0bc7', timestamp '2026-10-07 09:00'), -- Fun Hike with PINYX
  ('5940e163', timestamp '2026-09-26 13:00'), -- WIF 2026
  ('0b0bc110', timestamp '2026-08-21 13:30')  -- Sosialisasi
) AS v(id_prefix, start_at_now)
WHERE left(e.id::text, 8) = v.id_prefix
  AND date_trunc('minute', e.start_at) = v.start_at_now;

-- Periode Rekrutmen "Kabinet Maju 2026/2027" (sudah ditutup), dari form yang sama polanya.
UPDATE recruitment_periods SET
  opens_at = opens_at - interval '8 hours',
  closes_at = closes_at - interval '8 hours'
WHERE left(id::text, 8) = '70429392'
  AND date_trunc('minute', opens_at) = timestamp '2026-08-01 14:00';
