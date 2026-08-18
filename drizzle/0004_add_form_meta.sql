-- Single-row settings for the membership form ("Setelan" panel).
CREATE TABLE IF NOT EXISTS "membership_form_meta" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL DEFAULT 'Formulir Pendaftaran Anggota PPIT Nanjing',
  "description" text NOT NULL DEFAULT 'Formulir ini digunakan untuk mendata mahasiswa Indonesia yang ingin bergabung sebagai anggota resmi PPIT Nanjing. Pastikan data yang diisi valid.',
  "banner_enabled" boolean NOT NULL DEFAULT false,
  "confirmation_message" text NOT NULL DEFAULT 'Terima kasih! Pendaftaran kamu sudah kami terima.',
  "updated_at" timestamp NOT NULL DEFAULT now()
);
