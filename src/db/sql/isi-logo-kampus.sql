-- JALANKAN SETELAH DEPLOY: berkas di public/logos/universities harus sudah ada di produksi,
-- kalau tidak, situs live menampilkan 37 gambar rusak (terjadi 13 November 2026, langsung dibatalkan).
-- npx tsx --env-file=.env src/db/apply-sql.ts src/db/sql/isi-logo-kampus.sql
-- Logo kampus dari Wikipedia, disimpan di public/logos/universities (13 November 2026).
-- Hanya baris yang logonya masih kosong, jadi logo yang diisi pengurus tidak tertimpa.
-- Membatalkan: UPDATE universities SET logo_url = NULL WHERE logo_url LIKE '/logos/universities/%';
UPDATE universities AS u
SET logo_url = v.url
FROM (VALUES
  ('dc445c7b-30b0-4cda-9c97-cb383892222e'::uuid, '/logos/universities/huaiyin-normal-university.webp'),
  ('447b3b02-40b2-4a80-9620-46809de380cd'::uuid, '/logos/universities/just.webp'),
  ('c4456b2f-ef37-47df-a83f-73986ab5769c'::uuid, '/logos/universities/nufe.webp'),
  ('702d1da6-1739-4fef-9c95-0c1ac95fcda8'::uuid, '/logos/universities/ntu.webp'),
  ('ec54d30c-af16-4d72-943b-dbe7e16e8e8c'::uuid, '/logos/universities/jiangsu-ocean-university.webp'),
  ('e4b5a4bb-4a1c-4c14-ae7e-0f8441d1ff78'::uuid, '/logos/universities/cpu.webp'),
  ('6855bade-d715-4b23-abe3-f5db9b1048a4'::uuid, '/logos/universities/hhu.webp'),
  ('87dc698a-da92-46db-8e58-cfeb8bd5f9b6'::uuid, '/logos/universities/jiangsu-second-normal-university.webp'),
  ('5e1b3fc6-d90e-4bb9-8bf1-e6eb1789daca'::uuid, '/logos/universities/jinling-institute.webp'),
  ('7d1d4c58-0d09-4052-b4a2-103df596cf33'::uuid, '/logos/universities/nanjing-agricultural-university.webp'),
  ('77a4bed7-142e-4235-8911-fac9ba6dbe43'::uuid, '/logos/universities/nanjing-audit-university.webp'),
  ('dfcecb03-e666-4271-b00d-07d65535efdb'::uuid, '/logos/universities/njcit.webp'),
  ('c0498ad9-2f82-4b0d-9dca-4f1b8347a141'::uuid, '/logos/universities/nfu.webp'),
  ('807c3b37-853d-459c-aa4b-4aaa8209f19a'::uuid, '/logos/universities/nanjing-institute-of-technology.webp'),
  ('c9f81d79-4502-43f9-adb4-a1add57a5ac0'::uuid, '/logos/universities/nmu.webp'),
  ('d6288afe-2445-4c04-a69a-e7c8511ac3a1'::uuid, '/logos/universities/nnu.webp'),
  ('3b4c5e25-0ed7-436b-a95b-8903f8faf32c'::uuid, '/logos/universities/nanjing-police-institute.webp'),
  ('14895c85-fdfc-467b-9b96-e17671125985'::uuid, '/logos/universities/nanjing-sport-institute.webp'),
  ('552aba0e-2eac-4a00-82f8-067244f48f6a'::uuid, '/logos/universities/ntu.webp'),
  ('ba8dbc8e-0e56-4d06-9361-c2b23621be3b'::uuid, '/logos/universities/nju.webp'),
  ('29e883e3-97a5-4a21-8440-dea3d2711e47'::uuid, '/logos/universities/nuaa.webp'),
  ('fd300ac8-e8a8-4cd1-8f0f-b8b539a62268'::uuid, '/logos/universities/njucm.webp'),
  ('fc60975c-c6af-494f-9c63-b5ddc76879c1'::uuid, '/logos/universities/nufe.webp'),
  ('9a9a3140-73f4-4b07-b691-1bc91bd92f75'::uuid, '/logos/universities/nuist.webp'),
  ('c9efad29-1fa4-41fe-9ad4-5190a44a54e2'::uuid, '/logos/universities/njupt.webp'),
  ('25a19fbe-d74b-4f49-9fa7-37b58d890053'::uuid, '/logos/universities/nust.webp'),
  ('a4b4ec84-4bd2-4c56-b6ca-41079ac0b9c7'::uuid, '/logos/universities/nxu.webp'),
  ('37f954fd-3a98-42b8-b18f-970ac12903ee'::uuid, '/logos/universities/sanjiang-university.webp'),
  ('d850289c-9ac0-454d-812a-a712f4ae6d99'::uuid, '/logos/universities/seu.webp'),
  ('7b755fdd-3c0a-4b61-a497-b0cd27c1bebb'::uuid, '/logos/universities/cumt.webp'),
  ('059670a0-758c-47e7-9dfd-c48644e39ac1'::uuid, '/logos/universities/jiangsu-normal-university.webp'),
  ('ff746eb6-2a37-4046-9b34-8bf30620165c'::uuid, '/logos/universities/xuzhou-medical-university.webp'),
  ('e0d10414-4e09-4dc8-be83-39057a67a42e'::uuid, '/logos/universities/xuzhou-normal-university.webp'),
  ('0408f7e1-03ce-4a8c-916b-2b62e83acc03'::uuid, '/logos/universities/xuzhou-university-of-technology.webp'),
  ('e8ee2a7e-2411-424c-b82f-b926451e15d4'::uuid, '/logos/universities/yit.webp'),
  ('6148f73e-5d37-41c6-b2cd-d90b20055128'::uuid, '/logos/universities/jsu.webp'),
  ('259e1e01-d60a-4ba7-997f-875234b7e755'::uuid, '/logos/universities/just.webp')
) AS v(id, url)
WHERE u.id = v.id AND u.logo_url IS NULL
