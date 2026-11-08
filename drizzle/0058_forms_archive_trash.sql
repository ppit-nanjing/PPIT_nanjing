-- Migrasi 0058 — Arsip dan Sampah untuk Formulir Kustom (baris tabel forms dengan kind = 'survei').
--
-- Arsip: formulir yang sudah selesai. Aksi arsip mengisi archived_at/archived_by dan menutup formulirnya
-- (is_open = false). Ia hilang dari daftar aktif, tetapi jawabannya tetap bisa dibuka dan diekspor, dan
-- "Keluarkan dari Arsip" tidak membukanya kembali.
-- Sampah (soft delete): "Hapus" tidak lagi menghapus baris formulir. Ia mengisi deleted_at/deleted_by dan
-- menutup formulirnya, sehingga formulir hilang dari semua halaman, tautan publiknya 404, dan tidak bisa
-- dikelola siapa pun sampai dipulihkan, sementara pertanyaan dan jawaban tetap utuh. Hapus permanen
-- (DELETE sungguhan, cascade seperti sebelumnya) hanya bisa dari bagian Sampah.
-- Pemilu dan Oprek tidak memakai kolom ini (selalu NULL) dan tetap dihapus seperti sebelumnya.
--
-- Aman dijalankan ulang (IF NOT EXISTS). Tidak mengubah data yang ada: semua formulir lama tetap aktif
-- (kedua pasang kolom NULL).
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "archived_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "deleted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
