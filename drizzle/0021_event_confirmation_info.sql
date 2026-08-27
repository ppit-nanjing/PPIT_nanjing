-- Info pasca-pendaftaran per-acara, tampil di halaman tiket peserta (bukan di
-- halaman acara publik). Contoh WIF: "add salah satu WeChat ini untuk masuk
-- grup". Juga cocok untuk tautan rundown / alamat lengkap / kontak panitia.

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "confirmation_info" text;
