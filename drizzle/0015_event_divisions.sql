-- Struktur kepanitiaan bertingkat per acara: Departemen -> sub-tim.
-- Contohnya WIF (Welcoming Indonesian Freshman): Departemen "Perlengkapan"
-- menaungi "Konsumsi" (2 orang), "Perlengkapan" (3 orang), dan "Sound System"
-- (2 orang), masing-masing dengan job description sendiri.
--
-- Nama divisinya teks bebas, BUKAN enum: WIF cuma satu contoh dan acara
-- berikutnya belum tentu bersusun sama. Enum akan berarti migrasi tiap kali ada
-- acara dengan susunan baru.
--
-- Belum ada lapisan template ("pakai ulang struktur WIF tahun depan"). Baris di
-- sini sudah berdiri sendiri per acara, jadi template nanti cukup jadi tabel
-- baru yang MENYALIN ke sini - tidak perlu memigrasikan data yang sudah ada.
CREATE TABLE IF NOT EXISTS "event_divisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "parent_division_id" uuid REFERENCES "event_divisions"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "quota" integer,
  "job_description" text,
  "order_index" integer NOT NULL DEFAULT 0
);

-- Menampilkan struktur satu acara selalu mengambil seluruh divisinya sekaligus.
CREATE INDEX IF NOT EXISTS "event_divisions_event_id_idx" ON "event_divisions" ("event_id");

-- Divisi tempat seorang panitia ditempatkan. NULL = ditugaskan sebelum struktur
-- divisi ada, atau panitia inti yang memang tidak di bawah divisi mana pun.
--
-- ON DELETE SET NULL, bukan CASCADE: menghapus sebuah divisi tidak boleh ikut
-- menghapus catatan bahwa orangnya pernah jadi panitia acara itu - itu dasar
-- Work Ledger dan penerbitan sertifikatnya.
ALTER TABLE "event_committee"
  ADD COLUMN IF NOT EXISTS "division_id" uuid REFERENCES "event_divisions"("id") ON DELETE SET NULL;
