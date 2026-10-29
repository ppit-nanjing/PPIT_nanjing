# Formulir & Oprek (Pemilu, BPH Acara, Kepanitiaan)

> Bagian dari [Information Architecture](./Information%20Architecture.md). Audit terhadap kode: **2026-10-12** (modul dibangun bertahap; lihat [Status](#status-fase)).

> Formulir buatan sendiri untuk riset pasar/kuesioner (judul dan pertanyaan bebas, wajib login atau publik) ada di dokumen lain: [Formulir Kustom](./Formulir%20Kustom.md). Ia memakai tabel `forms`/`form_fields` yang sama (jenis `survei`) tetapi bukan Oprek/Pemilu: tidak ada lamaran, status, atau penempatan panitia.

Modul **Formulir** di console adalah rumah empat alur formulir internal kabinet:

| Tab | Isi | Pengelola |
|---|---|---|
| **Pendaftaran PPIT** | Pintasan ke modul `/console/membership` yang sudah ada (form publik Join Us) | pemegang modul `membership` |
| **Pemilu** | Pendaftaran calon untuk kepengurusan periode berikutnya | BPH Inti + Divisi Teknologi (modul `forms`) |
| **Oprek BPH Acara** | Rekrutmen BPH Acara (ketua/wakil/sekretaris/bendahara/supervisor) untuk **satu acara/proker** | Koor divisi mana pun (praktiknya untuk proker divisinya) + BPH Inti/Tech |
| **Oprek Kepanitiaan** | Dua jenis form berdivisi, berurutan: **Oprek Kadiv** (`oprek_kadiv`, ketua tiap divisi) lalu **Oprek anggota** (`oprek_kepanitiaan`, satu form untuk semua divisi) | Oprek Kadiv: BPH Acara acara itu + BPH Inti/Tech. Oprek anggota: BPH Acara + **Kadiv** acara itu + BPH Inti/Tech |

## Riwayat: jangan tertukar dengan modul Formulir lama

Sebelum rilis (branch `feat/forms-and-evaluasi-panitia`, 5 Okt 2026) pernah ada **"Formulir generik"** — `form_templates`/`form_submissions`, halaman `/recruitment` + `/evaluation/*`, pengisian **publik anonim** dengan token perangkat, sebagai pengganti Google Forms. Modul itu dibuang saat review (commit `7634446`, keputusan D1) dan sisa tabelnya dibersihkan `drizzle/0047_drop_unused_form_tables.sql`; evaluasi panitia ditulis ulang di atas builder evaluasi acara.

Modul di dokumen ini **berbeda arah**: formulir **internal kabinet** (wajib login + baris di Struktur Organisasi), terikat acara untuk Oprek, dengan keputusan yang menulis penugasan ke `event_committee`. Namespace `/console/forms`, modul `forms`, dan prefix kamus `forms.*` sengaja dipakai ulang (sudah bebas di master), tetapi jangan salin desain lama (anonim/token perangkat) tanpa alasan.

## Data model (migrasi `0049_forms_oprek.sql`)

- **`forms`** — `kind` (`pemilu | oprek_bph_acara | oprek_kepanitiaan`), `event_id` (FK cascade; wajib untuk dua jenis oprek, NULL untuk pemilu), judul, deskripsi, `is_open` + `opens_at`/`closes_at` (hanya `is_open` yang ditegakkan), `confirmation_message`, `bph_roles` (posisi BPH yang dibuka), `created_by`.
- **`form_fields`** — pertanyaan builder, pola sama `membership_form_fields` (`type` memakai enum `membership_field_type` yang sama); unik `(form_id, key)`.
- **`form_applications`** — satu baris per (form, user). Kolom sistem: `full_name` (snapshot `sensus_profiles.full_name ?? users.name`), `cabinet_division` (snapshot divisi asal), `position_applied` (BPH), `choice1_division_id`/`choice2_division_id`/`assigned_division_id` (FK `event_divisions` set null), `assigned_role` (enum `event_committee_role`), `status` (`pending | accepted | accepted_choice1 | accepted_choice2 | reassigned | rejected`), `note`, `responses` (jsonb), `submitted_at`, `reviewed_at`.
- **`event_responsible_departments`** — divisi kabinet penanggung jawab acara (proker). Boleh lebih dari satu (proker gabungan). **Bukan** `event_divisions` (divisi kepanitiaan di dalam acara).

## Akses (server-enforced)

Gerbang tunggal: `src/lib/form-access.ts`.

- `getFormsAccess()` — full / modul `forms` / `isCoordinator` (Koordinator Divisi & kepala unit, dari sesi) / BPH Acara (`bphEventIds`).
- `requireFormsHub/requirePemiluTab/requireBphTab/requireKepanitiaanTab` untuk halaman; `requireFormManage(formId)` **wajib** untuk halaman/aksi/ekspor per form (404 kalau tidak berhak); `canPlaceApplicant()` untuk penulisan penempatan (menghormati kunci acara 14 hari).
- Pengisian form: `getCabinetMembership(userId)` — wajib punya baris `department_members` + status akun bukan `suspended`; dicek di halaman **dan** aksi submit.
- Pengisian form **Oprek** (`isOprekKind`: BPH acara, kepanitiaan, Kadiv; bukan Pemilu) juga mewajibkan **sensus lengkap** (`hasCompletedSensus`): halaman mengarahkan ke `/sensus?returnTo=…`, aksi submit mengulang cek yang sama. Pelamar yang sudah pernah mengirim tetap bisa melihat statusnya. Menjadi anggota struktur kabinet **tidak** mewajibkan sensus lengkap; hanya mengisi Oprek (dan mendaftar acara yang `requiresSensus`) yang diwajibkan.
- Sesi (`src/auth.ts`) membawa `isCoordinator`, `isCommittee`, `isBphCommittee` dari satu query gabungan — sidebar/layout tidak query tambahan. `seed.ts` menaruh Koordinator Divisi sebagai `scoped` (koordinator tetap dapat menu Formulir lewat `isCoordinator`, bukan modul).

## Keputusan desain

- **QR grup panitia (2026-10-18, migrasi `0054_forms_group_qr.sql`)**: kolom `forms.group_qr_url`, `group_qr_note`, `group_qr_audience` (`submitted` | `accepted`, CHECK constraint). Diatur di Setelan form ("QR grup panitia"): unggah gambar ke folder `form-qr` (blob publik, `FOLDER_MODULE` null karena BPH Acara/Kadiv bisa tanpa modul admin), catatan, dan siapa yang melihat. `updateFormSettings` hanya menerima URL blob publik berawalan `/form-qr/` (`isFormGroupQrUrl`); nilai lain diabaikan. QR tampil di `/forms/<id>/submitted` — untuk semua yang sudah mengirim, atau hanya status diterima (`isAcceptedFormStatus`; pelamar yang masih menunggu melihat keterangan bahwa QR muncul setelah diterima). Notifikasi/email `oprek_accepted` menambahkan tautan ke halaman itu kalau form punya QR. QR grup WeChat kedaluwarsa 7 hari — pengelola perlu unggah ulang.
- **Baris "Divisi Pilihan" (2026-10-17, tanpa migrasi)**: form Oprek berdivisi (`oprek_kadiv`, `oprek_kepanitiaan`) punya baris `form_fields` khusus `key = "sys_division_choice"` (`DIVISION_FIELD_KEY`, tipe `section`) yang dibuat otomatis saat form dibuat. Baris ini tampil di Daftar Pertanyaan dan bisa diseret seperti pertanyaan lain — posisinya = posisi Pilihan Divisi 1 & 2 di form publik; keterangannya tampil di atas pilihan. Tidak bisa dihapus/disalin dan tipenya dipaksa `section`, jadi submit/ekspor/analitik melewatinya (jawaban tetap di `choice1/choice2_division_id`). Pilihannya selalu `event_divisions` acara itu; tombol "Tambah divisi" di kartu ini (`addFormEventDivision`, butuh `event.manageCommittee` = BPH Acara/BPH Kabinet, bukan Kadiv) menambah divisi langsung ke Struktur Kepanitiaan acara. Ganti nama/hapus divisi tetap dari halaman acara. Form lama tanpa baris ini: pilihan divisi tampil paling atas seperti sebelumnya.
- **Form terbuka untuk semua akun (2026-10-17, migrasi `0053_forms_open_to_all.sql`)**: kolom `forms.open_to_all_accounts` (toggle di Setelan, default mati). Kalau nyala, form Oprek boleh diisi akun mana pun yang login dan tidak suspended — untuk acara lintas cabang seperti SKR. Pemilu selalu khusus kabinet. Aturan satu-satunya di `canFillForm` (`src/lib/form-access.ts`), dipakai halaman isi, metadata, dan aksi submit. Pelamar luar kabinet tercatat dengan divisi asal "Luar kabinet".

- **Kadiv (2026-10-15, migrasi `0052_oprek_kadiv.sql`)**: peran panitia `kadiv` + jenis form `oprek_kadiv`. Oprek Kadiv dibuat & diputuskan BPH Acara; yang diterima jadi `kadiv` di divisi pilihannya. Oprek anggota tetap **satu formulir untuk semua divisi**: setiap Kadiv acara itu boleh membuatnya, melihat semua pelamar, dan memutuskan semua divisi (keputusan BPH), tetapi penempatannya dibatasi ke peran anggota divisi (`KADIV_PLACEMENT_ROLES`, ditegakkan di `updateApplicationPlacement` via `isKadivOnlyPlacer`). Penempatan di Oprek anggota tidak menurunkan Kadiv/BPH yang sudah ada. Akses acara Kadiv = panitia biasa (fitur dasar + grant divisi); bukan BPH Panitia. Menu Formulir tampil lewat flag sesi `isEventKadiv`.
- **SC dari cabang lain** (mis. SKR): cukup peran `supervisor` yang sudah ada — panitia non-kabinet hanya melihat menu Kegiatan untuk acaranya sendiri (+ Formulir acaranya), tidak melihat modul kabinet.

- **bendahara termasuk BPH Acara** (`BPH_PANITIA_ROLES` di `src/lib/event-capabilities.ts`) — alur kepanitiaan PPIT menempatkan bendahara di BPH Acara; konsekuensinya role `bendahara` di `event_committee` memperoleh kapabilitas acara setingkat BPH Panitia (kecuali hapus/ambil-alih).
- **PIC orang per acara DITIADAKAN** (keputusan 2026-10-12): Ketua Pelaksana hasil Oprek BPH sudah otomatis memegang peran itu lewat `event_committee`.
- **Divisi Penanggung Jawab = unit, boleh >1** (`event_responsible_departments`). Sejak akses modul Kegiatan dibuat spesifik (lihat [Event Management](./Event%20Management.md)), baris PJ inilah yang memberi divisi terkait akses mengelola acara — hanya full admin yang boleh mengubahnya.
- **Acara di Sampah mengunci formnya.** Form Oprek milik acara yang dipindah ke Sampah (lihat [Sampah Kegiatan](./Sampah%20Kegiatan.md)) tidak bisa dibuka/diisi, disembunyikan dari daftar & picker, dan halaman kelola/ekspornya ditolak untuk semua orang sampai acaranya dipulihkan (`canManageForm`/`canPlaceApplicant` mengecek `getEventAccess().trashed`).
- **Satu acara = satu form Oprek BPH dan satu form Oprek Kepanitiaan.** Acara yang sudah punya form jenis itu tidak muncul lagi di pilihan "Buat Formulir" (dikecualikan lewat subquery `notInArray`), dan `createForm` menolak POST dobel (`?error=exists`). Alurnya: Oprek BPH dulu → BPH terbentuk → baru Oprek Kepanitiaan. Untuk mengulang rekrutmen, hapus dulu form lamanya (lamaran lama ikut terhapus).
- **Hasil Oprek otomatis menulis penugasan** ke `event_committee` (upsert unik `(event,user)`): diterima BPH → role posisi; diterima kepanitiaan → divisi pilihan/dipindah + role (default anggota, dropdown reviewer); ditolak → baris panitia dihapus kalau tidak ada penerimaan lain. Perubahan role/divisi lewat tombol Simpan + notifikasi (template `oprek_*`).
- **Share per form**: tombol Bagikan/Salin tautan ke grup WeChat (halaman `/forms/[id]` tetap butuh login + kabinet).

## Status fase

- [x] Fase 1 — fondasi: migrasi 0049, modul `forms`, sesi koor/panitia, hub + 4 tab (gerbang server).
- [x] Fase 2 — builder bersama (FormFieldEditor/QuestionBank parameterisasi) + CRUD form + setelan + daftar per tab.
- [x] Fase 3 — halaman isi `/forms/[id]` + submit + share + pratinjau di halaman kelola (lampiran folder privat `form-file`).
- [x] Fase 4-6 — respons + detail pelamar + penempatan/auto-assign `event_committee` + notifikasi `oprek_*` (semua jenis form).
- [x] Fase 4b — Divisi Penanggung Jawab acara (boleh >1) di konsol acara + filter laporan `event_attendance`.
- [x] Fase 7 — analitik per form + ekspor CSV/XLSX.
- [x] Fase 8 — artikel Help Center slug `oprek` (di-seed ke database) + review akhir + merge.

## Terkait

- [Career Flow](./Career%20Flow.md), [Join Us Flow](./Join%20Us%20Flow.md), [Event Management](./Event%20Management.md), [Evaluasi Panitia Acara](./Evaluasi%20Panitia%20Acara.md).
