-- Migrasi 0054 — QR grup panitia di halaman setelah mengirim form.
--
-- Pengelola form (BPH Acara / pengurus) bisa mengunggah gambar QR grup
-- (mis. grup WeChat panitia) + catatan singkat. QR tampil di
-- /forms/<id>/submitted: untuk semua yang sudah mengirim ('submitted') atau
-- hanya pelamar yang diterima ('accepted'). Semua kolom opsional; form lama
-- tidak berubah (tanpa QR). Aman dijalankan ulang.
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "group_qr_url" text;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "group_qr_note" text;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "group_qr_audience" text NOT NULL DEFAULT 'submitted';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forms_group_qr_audience_check') THEN
    ALTER TABLE "forms"
      ADD CONSTRAINT "forms_group_qr_audience_check" CHECK ("group_qr_audience" IN ('submitted', 'accepted'));
  END IF;
END $$;
