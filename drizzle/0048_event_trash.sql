-- Migrasi 0048 — Sampah untuk Kegiatan (soft delete).
--
-- "Hapus" di /console/events tidak lagi menghapus baris acara: ia mengisi
-- deleted_at/deleted_by, sehingga acara hilang dari situs publik, daftar konsol,
-- dan akses panitia, tapi pendaftar, panitia, evaluasi, dll. tetap utuh dan bisa
-- dipulihkan. Hapus permanen (DELETE sungguhan, cascade seperti sebelumnya)
-- hanya bisa dari bagian Sampah.
--
-- Aman dijalankan ulang (IF NOT EXISTS). Tidak mengubah data yang ada: semua
-- acara lama tetap deleted_at = NULL (aktif).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deleted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
