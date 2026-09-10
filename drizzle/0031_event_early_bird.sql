-- Tarif bertahap: early bird -> normal.
--
-- events.early_bird_until   = batas tahap early bird (NULL = tidak ada tahap).
-- event_fee_options.early_bird_amount_cny = tarif early bird per kategori
--                             (NULL = kategori itu tidak diskon).
--
-- Tier pendaftar dihitung dari event_registrations.registered_at vs
-- events.early_bird_until — tidak ada kolom baru di event_registrations. Baris
-- lama: kedua kolom NULL -> semua tetap bayar tarif normal (perilaku tidak
-- berubah).

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "early_bird_until" timestamp;
ALTER TABLE "event_fee_options" ADD COLUMN IF NOT EXISTS "early_bird_amount_cny" integer;
