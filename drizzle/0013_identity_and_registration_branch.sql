-- Menutup dua lubang identitas yang muncul saat data sensus mulai disetor ke
-- PPI Tiongkok pusat.
--
-- 1) Satu orang = satu baris sensus, ditegakkan lewat nomor paspor.
--    "user_id" yang unik saja tidak cukup: satu orang bisa punya dua akun
--    Google (pribadi + kampus), mengisi sensus dua kali, lalu terhitung dua
--    anggota di sini DAN terkirim dobel ke pusat. Nomor paspor satu-satunya
--    identitas yang benar-benar unik per orang di form ini - email bahkan tidak
--    ada di form pusat.
--
--    NULL boleh berulang (profil yang belum diisi belum punya nomor paspor);
--    Postgres mengizinkan banyak NULL pada kolom unique, jadi itu persis
--    perilaku yang diinginkan.
--
--    CATATAN: kalau pernyataan ini gagal, artinya SUDAH ADA nomor paspor
--    kembar di Neon. Cari dulu dengan:
--      SELECT passport_number, count(*) FROM sensus_profiles
--      WHERE passport_number IS NOT NULL
--      GROUP BY passport_number HAVING count(*) > 1;
--    lalu putuskan akun mana yang dipertahankan sebelum mengulang migrasi ini.
ALTER TABLE "sensus_profiles"
  ADD CONSTRAINT "sensus_profiles_passport_number_unique" UNIQUE ("passport_number");

-- 2) Cabang yang dijawab peserta acara saat mendaftar. Hanya ditanyakan ke
--    orang yang sensusnya belum lengkap - tanpa ini, "Nanjinger yang belum isi
--    sensus" dan "tamu dari luar" sama-sama muncul sebagai baris kosong dan
--    tidak bisa dibedakan. NULL = pendaftaran lama, sebelum pertanyaan ini ada.
ALTER TABLE "event_registrations"
  ADD COLUMN IF NOT EXISTS "branch" text;
