-- Kuota per kategori tarif (event_fee_options.quota).
--
-- NULL = tanpa batas per-kategori; hanya events.capacity yang berlaku (perilaku
-- lama, semua baris yang sudah ada tetap NULL). Kalau diisi, pendaftaran yang
-- memilih kategori itu dibatasi angka tsb — begitu penuh, kategori itu saja yang
-- tertutup sementara kategori lain masih menampung.
--
-- WIF 2026: Freshmen 130, Non-freshmen 20 = 150 = events.capacity peserta penuh
-- (keputusan rapat: TIDAK ada pendaftaran On The Spot).

ALTER TABLE "event_fee_options" ADD COLUMN IF NOT EXISTS "quota" integer;
