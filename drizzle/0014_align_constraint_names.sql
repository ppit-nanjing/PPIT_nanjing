-- Menyamakan nama constraint dengan konvensi Drizzle, supaya `drizzle-kit push`
-- berhenti melihat drift palsu.
--
-- Asal masalahnya: migrasi 0008-0013 ditulis tangan sebagai SQL biasa, dan
-- Postgres memberi nama bawaannya sendiri ("_fkey", "_key") pada constraint yang
-- ditulis inline. Drizzle menamai punyanya "<tabel>_<kolom>_<tabel_tujuan>_<kolom_tujuan>_fk"
-- dan "<tabel>_<kolom>_unique". Karena namanya beda, push membacanya sebagai
-- "constraint ini tidak ada" + "ada constraint asing" - lalu menawarkan
-- memperbaikinya. Untuk coverage_cities (9 baris) tawarannya adalah
-- MEN-TRUNCATE tabelnya, dan `--force` mengiyakan tanpa bertanya. Itu jebakan
-- yang tercatat di Progress & Handoff gap #9.
--
-- Constraint-nya sendiri SUDAH BENAR dan sudah ada sejak awal - yang salah cuma
-- namanya. Jadi ini murni rename metadata: tidak ada data yang disentuh, tidak
-- ada indeks yang dibangun ulang.
--
-- Dikecualikan: membership_applications_recruitment_period_id_recruitment_perio
-- sudah memakai nama Drizzle, cuma dipotong Postgres di batas 63 karakter.

ALTER TABLE "coverage_cities" RENAME CONSTRAINT "coverage_cities_slug_key" TO "coverage_cities_slug_unique";
ALTER TABLE "districts" RENAME CONSTRAINT "districts_name_key" TO "districts_name_unique";

ALTER TABLE "branch_universities" RENAME CONSTRAINT "branch_universities_branch_id_fkey" TO "branch_universities_branch_id_regional_branches_id_fk";

ALTER TABLE "certificates" RENAME CONSTRAINT "certificates_user_id_fkey" TO "certificates_user_id_users_id_fk";
ALTER TABLE "certificates" RENAME CONSTRAINT "certificates_event_id_fkey" TO "certificates_event_id_events_id_fk";
ALTER TABLE "certificates" RENAME CONSTRAINT "certificates_issued_by_fkey" TO "certificates_issued_by_users_id_fk";

ALTER TABLE "donations" RENAME CONSTRAINT "donations_user_id_fkey" TO "donations_user_id_users_id_fk";

ALTER TABLE "event_committee" RENAME CONSTRAINT "event_committee_event_id_fkey" TO "event_committee_event_id_events_id_fk";
ALTER TABLE "event_committee" RENAME CONSTRAINT "event_committee_user_id_fkey" TO "event_committee_user_id_users_id_fk";

ALTER TABLE "event_registrations" RENAME CONSTRAINT "event_registrations_payment_verified_by_fkey" TO "event_registrations_payment_verified_by_users_id_fk";
