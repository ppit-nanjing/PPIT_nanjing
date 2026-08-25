-- Menambah 4 kategori tempat baru ke enum place_category (halaman /places).
-- Sebelumnya: tourism, spiritual, practical. Ditambah: culture, nature, food,
-- shopping — supaya /places bisa memfilter tempat lebih bervariasi.
--
-- ALTER TYPE ... ADD VALUE hanya MENAMBAH nilai; tidak pernah drop/truncate,
-- jadi aman di database produksi (tidak seperti `drizzle-kit push --force`,
-- lihat src/db/apply-sql.ts). IF NOT EXISTS membuatnya idempoten — aman
-- dijalankan ulang. Postgres menuntut tiap ADD VALUE berdiri sendiri di luar
-- blok transaksi; apply-sql.ts menjalankan tiap pernyataan terpisah.
ALTER TYPE "place_category" ADD VALUE IF NOT EXISTS 'culture';
ALTER TYPE "place_category" ADD VALUE IF NOT EXISTS 'nature';
ALTER TYPE "place_category" ADD VALUE IF NOT EXISTS 'food';
ALTER TYPE "place_category" ADD VALUE IF NOT EXISTS 'shopping';
