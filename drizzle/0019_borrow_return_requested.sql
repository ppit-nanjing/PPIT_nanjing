-- Borrower-initiated return requests: set when the member clicks
-- "Kembalikan" on /profile, cleared when an admin confirms via markReturned.
ALTER TABLE "borrow_requests" ADD COLUMN "return_requested_at" timestamp;
