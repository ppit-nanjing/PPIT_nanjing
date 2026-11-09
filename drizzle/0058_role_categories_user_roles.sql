-- Opsi B - model role per kategori + ranting sebagai DATA (2026-11).
--
-- Sebelumnya: satu role per orang (users.role_id tunggal), ranting dikenali
-- lewat NAMA role ("[INA] BPH Ranting") + hardcode di src/lib/rantings.ts.
-- Setelah ini:
--   * role_category enum  : kabinet | ranting | advisory
--   * roles.category      : kategori tiap role
--   * rantings            : tabel unit ranting (INA, JIA; Taizhou dll cukup
--                           INSERT data, tanpa ubah kode)
--   * user_roles          : multi-role per orang, MAKS SATU per kategori
--                           (unique(user_id, role_category)), FK komposit ke
--                           roles(id, category) menjaga kategori terkunci.
-- users.role_id TIDAK dihapus: berubah jadi mirror role kabinet (dikelola
-- updateUserRoles di src/app/actions/admin-users.ts) supaya path lama
-- (eksport CSV, header organisasi) tetap jalan tanpa perubahan besar.
--
-- Idempoten-ish (ON CONFLICT di seed), tapi dirancang dijalankan SEKALI.
-- Terapkan: npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0058_role_categories_user_roles.sql

-- ---------- 1. Enum ----------
CREATE TYPE role_category AS ENUM ('kabinet', 'ranting', 'advisory');

-- ---------- 2. roles.category ----------
ALTER TABLE roles ADD COLUMN category role_category NOT NULL DEFAULT 'kabinet';

-- Kategori berdasarkan isi DB sekarang (12 role): 8 kabinet + Dewan Pembina
-- advisory + 4 legacy "[INA]/[JIA] ..." ranting.
UPDATE roles SET category = 'ranting'
WHERE name LIKE '[INA] %' OR name LIKE '[JIA] %';
UPDATE roles SET category = 'advisory'
WHERE name = 'Dewan Pembina';

-- Index backing untuk FK komposit (user_roles.role_id, role_category) ->
-- roles(id, category).
CREATE UNIQUE INDEX roles_id_category_key ON roles (id, category);

-- ---------- 3. Tabel unit ranting ----------
CREATE TABLE rantings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  universities jsonb NOT NULL DEFAULT '[]'::jsonb,
  wechat_id text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Sementara dua, sesuai keputusan org (kota lain tetap "kota naungan" di
-- coverage_cities). Daftar universitas harus persis dengan yang dipakai
-- mahasiswa di dropdown sensus (branch_universities) - "NUIST" alias pendek
-- TIDAK terhitung (keterbatasan yang sudah diterima, lihat rantings.ts).
INSERT INTO rantings (code, label, universities, wechat_id, order_index) VALUES
  ('INA', 'INA · NUIST',
   '["Nanjing University of Information Science and Technology"]'::jsonb,
   'cal08ou_', 1),
  ('JIA', 'JIA · JSAHVC', '[]'::jsonb, NULL, 2);

-- ---------- 4. Role kanonik ranting (level, tanpa [kode] di nama) ----------
INSERT INTO roles (name, access_tier, description, category) VALUES
  ('BPH Ranting', 'scoped',
   'Pengurus ranting — akses ringkasan sensus kampus ranting yang dipilihnya (modul sensus-ranting)', 'ranting'),
  ('Anggota Ranting', 'scoped',
   'Anggota ranting — tanpa akses console kecuali diberikan akses lain oleh BPH pusat', 'ranting');

-- ---------- 5. Tabel user_roles ----------
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  role_category role_category NOT NULL,
  ranting_id uuid REFERENCES rantings(id) ON DELETE SET NULL,
  assigned_at timestamp NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  -- role ranting tanpa unit tidak boleh ada
  CONSTRAINT user_roles_ranting_needs_unit CHECK (role_category <> 'ranting' OR ranting_id IS NOT NULL)
);

-- Satu role per kategori per orang (aturan org, 2026-11)
CREATE UNIQUE INDEX user_roles_user_category_unique ON user_roles (user_id, role_category);

-- Kategori harus cocok dengan role yang dirujuk.
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_current_fkey
  FOREIGN KEY (role_id, role_category) REFERENCES roles (id, category);

-- ---------- 6. Backfill dari users.role_id ----------
INSERT INTO user_roles (user_id, role_id, role_category, ranting_id)
SELECT u.id, u.role_id, r.category,
       CASE
         WHEN r.name LIKE '[INA] %' THEN (SELECT id FROM rantings WHERE code = 'INA')
         WHEN r.name LIKE '[JIA] %' THEN (SELECT id FROM rantings WHERE code = 'JIA')
         ELSE NULL
       END
FROM users u
JOIN roles r ON r.id = u.role_id;

-- Bawa pemegang role legacy "[INA]/[JIA] ..." ke role kanonik + unit ranting.
UPDATE user_roles ur
SET role_id = (SELECT id FROM roles WHERE name = 'BPH Ranting')
WHERE ur.role_id IN (SELECT id FROM roles WHERE name LIKE '[%' AND name LIKE '%BPH Ranting%');

UPDATE user_roles ur
SET role_id = (SELECT id FROM roles WHERE name = 'Anggota Ranting')
WHERE ur.role_id IN (SELECT id FROM roles WHERE name LIKE '[%' AND name LIKE '%Anggota Ranting%');

-- users.role_id (mirror): pemegang legacy ikut dipetakan ke role kanonik.
UPDATE users u
SET role_id = (SELECT id FROM roles WHERE name = 'BPH Ranting')
WHERE u.role_id IN (SELECT id FROM roles WHERE name LIKE '[%' AND name LIKE '%BPH Ranting%');

UPDATE users u
SET role_id = (SELECT id FROM roles WHERE name = 'Anggota Ranting')
WHERE u.role_id IN (SELECT id FROM roles WHERE name LIKE '[%' AND name LIKE '%Anggota Ranting%');
