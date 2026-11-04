-- Migrasi 0059 — persetujuan BPH Kabinet per acara.
--
-- Semua pengurus kabinet boleh membuat draf acara, tapi acara baru bisa diterbitkan
-- atau dijadwalkan setelah disetujui. approved_at terisi = sudah disetujui.
--
-- Acara yang sudah tampil atau terjadwal dianggap sudah disetujui supaya panitianya
-- tidak tiba-tiba terkunci. approved_by sengaja kosong sebagai penanda acara lama
-- (lihat isPreApprovalEvent). Draf lama tetap perlu diajukan, dan acara yang dibatalkan
-- hanya bisa diaktifkan lagi oleh BPH Kabinet. Kolom lain di tabel events tidak berubah.
-- Jalankan SEBELUM kode yang membaca kolom ini ter-deploy, karena semua query acara
-- membaca kolom baru ini.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approval_requested_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approval_requested_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
UPDATE "events" SET "approved_at" = now() WHERE "status" NOT IN ('draft', 'cancelled') AND "approved_at" IS NULL;
