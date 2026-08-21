-- Menyamakan form Sensus dengan form PPI Tiongkok pusat.
--
-- 1) Daftar kampus per cabang, sumber dropdown bertingkat "Asal Cabang" →
--    "Nama Universitas". Terpisah dari tabel "universities" (direktori kampus
--    9 kota naungan PPIT Nanjing untuk halaman publik) karena ini cuma daftar
--    pilihan se-Tiongkok untuk satu field form.
CREATE TABLE IF NOT EXISTS "branch_universities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "branch_id" uuid NOT NULL REFERENCES "regional_branches"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "name_zh" text,
  "abbreviation" text,
  "order_index" integer NOT NULL DEFAULT 0
);

-- Satu kampus hanya boleh muncul sekali per cabang: bikin seed idempoten dan
-- mencegah dua opsi identik yang tak bisa dibedakan di dropdown.
CREATE UNIQUE INDEX IF NOT EXISTS "branch_universities_branch_name_idx"
  ON "branch_universities" ("branch_id", "name");

-- 2) Opt-in newsletter - field terakhir di form pusat, satu-satunya yang tidak
--    wajib di sana. Default false supaya baris lama tidak berubah artinya
--    (belum pernah ditanya = belum berlangganan).
ALTER TABLE "sensus_profiles"
  ADD COLUMN IF NOT EXISTS "subscribe_newsletter" boolean NOT NULL DEFAULT false;
