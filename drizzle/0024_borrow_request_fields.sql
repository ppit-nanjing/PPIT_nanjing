-- SOP Peminjaman Aset: lokasi penggunaan + berkas Pernyataan Peminjam
-- bertanda tangan. NULL = pengajuan lama sebelum kolom ini ada.
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "usage_location" text;
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "statement_url" text;
