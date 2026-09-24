-- Typography kartu deskripsi acara publik: font, ukuran, dan ketebalan yang
-- berlaku untuk seluruh teks deskripsi sekaligus (bukan rich text per-kata).
-- null di ketiganya = tampilan baku situs, jadi semua acara lama tidak
-- terpengaruh sama sekali.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description_font" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description_font_size" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "description_font_weight" text;
