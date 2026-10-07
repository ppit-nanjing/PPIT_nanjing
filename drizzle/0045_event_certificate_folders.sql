-- Folder sertifikat per acara (peserta & panitia): satu tautan https berisi
-- semua PDF, dipakai "Terbitkan semua yang berhak" supaya panitia tidak perlu
-- menempel tautan per orang. NULL = belum diisi (fitur massal nonaktif).

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "certificate_folder_peserta_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "certificate_folder_panitia_url" text;
