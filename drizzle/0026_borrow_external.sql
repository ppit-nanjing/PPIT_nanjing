-- Peminjam eksternal (pihak luar tanpa akun PPIT): user_id boleh NULL, kontak
-- disimpan di kolom borrower*.
ALTER TABLE "borrow_requests" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "borrower_name" text;
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "borrower_email" text;
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "borrower_wechat" text;
ALTER TABLE "borrow_requests" ADD COLUMN IF NOT EXISTS "borrower_phone" text;
