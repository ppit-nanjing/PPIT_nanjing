-- Migrasi 0050 — satu acara = satu form per jenis (Oprek BPH Acara / Oprek
-- Kepanitiaan). Penegakan keras di database; createForm (src/app/actions/forms.ts)
-- tetap memeriksa lebih dulu untuk pesan ramah, dan memetakan unique violation
-- (23505) ke pesan yang sama saat dua POST balapan.
--
-- event_id NULL (Pemilu — tidak terikat acara) dikecualikan lewat partial index.
-- Aman dijalankan ulang (IF NOT EXISTS). Tabel forms kecil; pembuatan index
-- tidak mengunci lama.
CREATE UNIQUE INDEX IF NOT EXISTS "forms_kind_event_unique_idx"
  ON "forms" ("kind", "event_id")
  WHERE "event_id" IS NOT NULL;
