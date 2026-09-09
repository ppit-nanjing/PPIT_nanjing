-- Roles untuk pengurus ranting (sub-cabang setingkat kampus: INA @ NUIST,
-- JIA @ JSAHVC). "BPH Ranting" -> hanya ringkasan sensus kampus sendiri di
-- /console/ranting/sensus (key "sensus-ranting"); "Anggota Ranting" -> tanpa
-- akses console sampai BPH pusat memberi role lain.
--
-- Dikenali lewat NAMA role di resolveAdminScope() (src/auth.ts) +
-- src/lib/rantings.ts. Tidak ada perubahan skema. Aman dijalankan berulang.

INSERT INTO roles (name, access_tier, description) VALUES
  ('[INA] BPH Ranting',     'scoped', 'Pengurus ranting INA (NUIST) — akses ringkasan sensus kampus sendiri'),
  ('[INA] Anggota Ranting', 'scoped', 'Anggota ranting INA (NUIST) — tanpa akses console kecuali diberikan BPH pusat'),
  ('[JIA] BPH Ranting',     'scoped', 'Pengurus ranting JIA (JSAHVC) — akses ringkasan sensus kampus sendiri'),
  ('[JIA] Anggota Ranting', 'scoped', 'Anggota ranting JIA (JSAHVC) — tanpa akses console kecuali diberikan BPH pusat')
ON CONFLICT (name) DO NOTHING;
