-- Migrasi 0047 — pembersihan objek sisa modul "Formulir generik" (di-reset dari
-- branch feat/forms-and-evaluasi-panitia; keputusan D1: fitur dikeluarkan).
--
-- PENTING: jalankan ini HANYA di database yang sebelumnya sudah menerima
-- eksperimen modul Formulir (produksi, 5 Oktober 2026) DAN setelah cadangan
-- isi form_templates/form_submissions dibuat. Di database yang bersih, semua
-- pernyataan di bawah adalah no-op berkat IF EXISTS.
--
-- event_committee_evaluations (versi lima kolom tetap evaluasi panitia)
-- dipastikan 0 baris sebelum dihapus — datanya tidak dimigrasi ke builder.
DROP TABLE IF EXISTS "form_submissions";
DROP TABLE IF EXISTS "form_templates";
DROP TYPE IF EXISTS "form_field_type";
DROP TYPE IF EXISTS "form_template_status";
DROP TABLE IF EXISTS "event_committee_evaluations";
