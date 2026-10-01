-- Poster/gambar lowongan (opsional) - ditampilkan di halaman /jobs/:id.
-- URL Blob publik (folder "jobs"). Nullable + additive: lowongan lama tetap
-- tampil seperti sebelumnya (ikon gedung default).

ALTER TABLE "job_postings" ADD COLUMN IF NOT EXISTS "image_url" text;
