-- QR "tambah sebagai kontak" untuk info setelah daftar (confirmation_info).
--
-- Dua slot tetap, bukan tabel terpisah - lihat komentar di schema.ts. Foto
-- diunggah lewat console (ImageUploadCropper, folder "events"), sama seperti
-- payment_qr_url.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "confirmation_contact_qr1_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "confirmation_contact_qr2_url" text;
