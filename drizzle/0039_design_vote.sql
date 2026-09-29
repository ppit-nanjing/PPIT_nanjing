-- Migrasi 0039: tabel voting design-lab (sementara).
-- Satu baris = satu voter (satu perangkat). Poin dihitung di aplikasi:
-- rank_1 = 3 poin, rank_2 = 2 poin, rank_3 = 1 poin. Terpisah total dari
-- tabel lain; hapus fitur = DROP TABLE ini + hapus route /api/design-vote.

CREATE TABLE IF NOT EXISTS "design_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "voter_name" text NOT NULL,
  "voter_city" text,
  "voter_token" text NOT NULL UNIQUE,
  "rank_1" text NOT NULL,
  "rank_2" text NOT NULL,
  "rank_3" text NOT NULL,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
