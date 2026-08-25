# Data Dictionary — PPIT Nanjing

> Bagian dari [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md). Detail kolom penuh per entitas, dikelompokkan per domain sesuai tabel ringkasan di ERD.

## Dua skop organisasi — penting dipahami sebelum baca tabel di bawah

Prototipe menggabungkan dua skop data organisasi yang berbeda level:

1. **PPI Tiongkok nasional** — induk organisasi (32 cabang regional di seluruh Tiongkok: Beijing, Tianjin, Harbin, Shanghai, Nanjing, Hangzhou, Guangzhou, Xiamen, Shenzhen, dst). Direpresentasikan oleh `REGIONAL_BRANCH` — data direktori, kemungkinan besar **read-only/diinput manual oleh admin Nanjing**, dipakai untuk halaman direktori & peta persebaran.
2. **PPIT Nanjing** — cabang Nanjing itu sendiri, yaitu aplikasi yang sedang dibangun. Struktur kepengurusan internalnya (Ketua, divisi/departemen, anggota) dimodelkan oleh `DEPARTMENT` + `DEPARTMENT_MEMBER`.

Jangan gabungkan keduanya jadi satu tabel — `DEPARTMENT` khusus struktur internal Nanjing, `REGIONAL_BRANCH` khusus direktori nasional.

---

## 1. Identitas & Akses

### USER (tabel `users`, sekaligus tabel Auth.js)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| email | text unique | |
| avatar_url | text | URL Vercel Blob |
| role_id | uuid FK → ROLE | |
| phone / wechat_id | text | Kontak — umum dipakai mahasiswa Indonesia di Tiongkok |
| status | enum | `active`, `inactive`, `suspended` |
| created_at, last_login_at | timestamp | |

### ROLE
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | |
| name | text | `super_admin`, `admin`, `department_head`, `member`, `guest` (dari layar *User Roles & Permissions*) |
| description | text | |

### PERMISSION / ROLE_PERMISSION
Junction many-to-many. `PERMISSION.key` contoh: `event.create`, `event.publish`, `user.manage`, `inventory.approve_borrow`, `report.generate`, `document.publish`. Granularitas persis diputuskan saat implementasi berdasar modul admin console yang ada.

### SENSUS_PROFILE (1:1 dengan USER)
Data sensus/pendataan detail mahasiswa — terpisah dari `USER` dasar karena formnya panjang & bertahap (multi-step, lihat layar *Sensus Profile*).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → USER, unique | |
| gender, birth_date | | |
| university, program, degree_level | text | S1/S2/S3, jurusan |
| city_in_china | text | Kota domisili saat ini |
| arrival_date | date | Tanggal tiba di Tiongkok |
| visa_type, scholarship_type | text | |
| emergency_contact_name / phone | text | |
| completion_status | enum | `incomplete`, `complete` |
| updated_at | timestamp | |

---

## 2. Organisasi

### DEPARTMENT
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | |
| name | text | |
| parent_department_id | uuid FK → DEPARTMENT, nullable | Struktur hierarki (layar *Reorder Hierarchy*) |
| head_user_id | uuid FK → USER, nullable | |
| order_index | int | Urutan tampil (drag-reorder) |
| description | text | |

### DEPARTMENT_MEMBER (junction)
`user_id`, `department_id`, `position` (jabatan dalam departemen), `joined_at`.

### AUDIT_LOG
`id`, `actor_user_id` FK → USER, `entity_type` (`department`/`user`/`role`), `entity_id`, `action`, `before_json`, `after_json`, `created_at`. Sumber: layar *Organizational Change Log*.

### ORGANIZATION_DOCUMENT
`id`, `type` (enum: `ad_art`, `guideline`, `other`), `title`, `file_url` (PDF), `version`, `department_id` nullable, `published_by` FK → USER, `published_at`. Sumber: layar *AD/ART* + *Review AD/ART Guidelines*.

### REGIONAL_BRANCH
`id`, `city_name`, `region` (enum: `north`/`east`/`south`/dst — dikonfirmasi dari konten referensi: North=Beijing/Tianjin/Harbin, East=Shanghai/Nanjing/Hangzhou, South=Guangzhou/Xiamen/Shenzhen), `member_count`, `lat`, `lng`, `contact_info`. Sumber: layar *Regional Branches* + *Peta Persebaran*.

---

## 3. Events

### EVENT
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid PK | |
| title, slug, description | text | |
| cover_image_url | text | |
| category | text | mis. "Cultural", "Academic" |
| location | text | |
| agenda | text nullable | rundown bebas, satu poin per baris |
| start_at, end_at, registration_deadline | timestamp | |
| capacity | int nullable | |
| status | enum | `draft`, `published`, `registration_closed`, `completed`, `cancelled` |
| scheduled_publish_at | timestamp nullable | publish otomatis begitu waktu ini terlewati |
| department_id | uuid FK → DEPARTMENT nullable | Panitia penyelenggara |
| created_by | uuid FK → USER | |
| is_paid | boolean | penanda acara berbayar (HTM), dipisah dari nominalnya karena nominal sering baru pasti belakangan (menunggu sponsor) |
| fee_cny | int nullable | null = gratis / belum ditetapkan |
| payment_instructions | text nullable | instruksi transfer untuk peserta |
| alipay_uid | text nullable | UID Alipay bendahara acara untuk deep-link prefill |
| certificate_for_participants | boolean, default `true` | saklar "semua peserta dapat e-certificate"; penerbitannya tetap manual lewat tombol Terbitkan Sertifikat Peserta |

### EVENT_REGISTRATION
`id`, `event_id` FK, `user_id` FK (unik per pasangan event+user), `status` (enum: `pending`, `confirmed`, `attended`, `cancelled`), `qr_code_token` (unik, untuk check-in — sumber: layar *Event Registration Success (QR Ticket)*), `registered_at`, `checked_in_at` nullable, `branch` (jawaban cabang sekali-pakai khusus acara ini, tidak disalin ke profil), `answers_json` (jawaban pertanyaan kustom `{ [questionId]: string }`; kunci pertanyaan yang dihapus dibiarkan mati). Pembayaran manual per-orangan: `payment_status` (`not_required`, `unpaid`, `submitted`, `verified`, `rejected`), `payment_proof_url` (bukti transfer yang dikirim peserta), `payment_note`, `payment_verified_at`, `payment_verified_by` FK → USER.

### EVENT_QUESTION
Pertanyaan tambahan form pendaftaran satu acara — kosong berarti form standar. `id`, `event_id` FK (cascade), `label`, `type` enum (`text`, `textarea`, `select`, `radio`, `multiselect`), `options` (satu opsi per baris, wajib untuk tipe pilihan), `required`, `order_index`.

### EVENT_DIVISION
Struktur divisi kepanitiaan satu acara. `id`, `event_id` FK, `parent_division_id` FK → dirinya sendiri (bertingkat bebas), `name` (**teks bebas** — tiap acara boleh punya susunan sendiri, bukan enum), `quota` (target jumlah orang, nullable), `job_description` (satu poin per baris), `order_index`.

### EVENT_COMMITTEE
Penugasan panitia **per acara** — sengaja terpisah dari DEPARTMENT_MEMBER karena jabatan panitia tidak mewarisi struktur kabinet (bendahara acara ≠ bendahara kabinet). `id`, `event_id` FK, `user_id` FK (unik per pasangan event+user; volunteer eksternal masuk lewat undangan akun dulu), `division_id` FK nullable (null = panitia inti tanpa divisi), `role` enum (`ketua`, `wakil`, `sekretaris`, `bendahara`, `supervisor`, `anggota`; nilai lama `humas`/`acara`/`logistik`/`dokumentasi` tinggal kompatibilitas — nama divisi kini teks bebas di EVENT_DIVISION), `note` (catatan tugas spesifik, mis. "PJ konsumsi"), `assigned_at`.

### CERTIFICATE
`id`, `user_id` FK (pemilik), `event_id` FK nullable (`set null` saat event dihapus), `kind` enum (`peserta`/`panitia`/`pemateri`/`lainnya` — sertifikat juara dicatat lewat judul bebas), `title`, `file_url` (file dibuat/diunggah di luar aplikasi, boleh tautan Drive), `issued_at`, `issued_by` FK → USER. Penerbitan **manual oleh admin**, bukan otomatis untuk semua peserta.

---

## 4. Konten

### NEWS_ARTICLE
`id`, `title`, `slug`, `content` (rich text), `cover_image_url`, `author_id` FK → USER, `status` (`draft`/`published`), `published_at`.

### GALLERY_ALBUM / GALLERY_PHOTO
`GALLERY_ALBUM`: `id`, `title`, `event_id` FK nullable, `cover_image_url`, `created_at`.
`GALLERY_PHOTO`: `id`, `album_id` FK, `image_url`, `caption`, `uploaded_by` FK → USER, `uploaded_at`.

---

## 5. Karir

### JOB_POSTING
`id`, `title`, `company`, `location`, `type` (enum: `internship`, `full_time`, `part_time`, `volunteer`), `description`, `requirements`, `application_deadline`, `posted_by` FK → USER, `status` (`open`/`closed`).

### JOB_APPLICATION
`id`, `job_id` FK, `user_id` FK, `resume_url`, `cover_letter`, `status` (enum: `submitted`, `under_review`, `interview`, `offered`, `rejected`), `applied_at`.

### CAREER_GUIDE_ARTICLE
`id`, `title`, `slug`, `content`, `category`, `author_id` FK nullable, `published_at`. Sumber: layar *Career Guide* ("Mastering the Chinese Tech Interview").

### MENTORSHIP_APPLICATION
`id`, `user_id` FK, `motivation`, `background`, `preferred_field`, `status` (`pending`/`matched`/`rejected`), `applied_at`. Sumber: layar *Join Mentorship Program* (Alumni Network Mentorship).

---

## 6. Keanggotaan

### RECRUITMENT_PERIOD
`id`, `is_open` boolean, `opens_at`, `closes_at`, `batch_label` (mis. "Batch 2025/2026"). Mengontrol state buka/tutup di layar *Join Us*.

### MEMBERSHIP_APPLICATION
`id`, `recruitment_period_id` FK, `user_id` FK nullable (belum tentu punya akun saat mendaftar), `full_name`, `email`, `university`, `motivation`, `status` (`pending`/`accepted`/`rejected`), `submitted_at`.

---

## 7. Inventaris & Peminjaman

### INVENTORY_ITEM
`id`, `name`, `category`, `description`, `image_url`, `total_quantity`, `available_quantity`, `condition` (`good`/`damaged`/`retired`), `location`, `status`.

### BORROW_REQUEST
`id`, `item_id` FK, `user_id` FK (peminjam), `quantity`, `purpose`, `requested_from`, `requested_to`, `status` (enum: `pending`, `approved`, `rejected`, `borrowed`, `returned`, `overdue`), `approved_by` FK → USER nullable, `requested_at`, `returned_at` nullable.

### INVENTORY_AUDIT_LOG
`id`, `item_id` FK, `performed_by` FK → USER, `action` (`added`/`adjusted`/`damaged`/`retired`), `quantity_delta`, `note`, `created_at`.

---

## 8. Admin & Sistem

### REPORT
`id`, `type` (enum: `event_attendance`, `inventory_audit`, `sensus_summary`, `student_export`, `custom`), `generated_by` FK → USER, `parameters_json` (filter tanggal/departemen/dll), `file_url` (hasil export), `generated_at`.

### NOTIFICATION_TEMPLATE
`id`, `key` (mis. `event.registration_confirmed`, `borrow.approved`), `channel` (enum: `email`, `in_app`, `push`), `subject`, `body_template`, `updated_by` FK, `updated_at`. Sumber: layar *Configuring Notification Templates*.

### NOTIFICATION
`id`, `user_id` FK, `template_id` FK nullable, `title`, `body`, `is_read` boolean, `related_entity_type`, `related_entity_id`, `created_at`.

### HELP_ARTICLE
`id`, `section` (mis. "User Management", "Event Management", "Inventory Control", "Regional Directories", "User Roles & Permissions" — 1:1 dengan 5 layar *Guide: ...* di admin console), `title`, `slug`, `content`, `author_id` FK nullable, `updated_at`.

### RELEASE_NOTE
`id`, `version`, `summary`, `details` (markdown), `published_by` FK → USER, `published_at`. Sumber: layar *Full Changelog (System Changelog)*.

### MANAGEMENT_PERIOD
Satu periode kepengurusan — digunakan untuk mengelompokkan/mengarsipkan tautan pendek saat turnover pengurus berganti. `id`, `label` (unik, mis. "2026/2027"), `starts_at`, `ends_at`, `is_current` boolean, `created_by` FK → USER, `created_at`. Sumber: layar *Tautan* (modul `links`).

### SHORT_LINK
Tautan pendek khusus PPIT Nanjing, mis. `nanjing.ppitiongkok.com/l/xxx`, yang meneruskan (302 redirect) ke dokumen/berkas (Google Drive, Vercel Blob, dll). `id`, `slug` (unik, bagian dari `/l/xxx`), `target_url`, `title`, `description` nullable, `category` (enum: `documentation`/`file`/`form`/`other`), `management_period_id` FK → MANAGEMENT_PERIOD nullable, `is_active` boolean, `expires_at` timestamp nullable, `click_count` int, `created_by` FK → USER nullable, `created_at`, `updated_at`. Sumber: layar *Tautan*.

> Catatan GFW: target berbasis Google (Drive, Forms) **tidak bisa dibuka dari dalam Tiongkok** — saranakan pengguna menyimpan berkas di Vercel Blob atau host ramah-China bila penerima berada di Tiongkok (lihat [Tech Stack](./Tech%20Stack.md)).

## Terkait

- [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md)
- [Tech Stack](./Tech%20Stack.md) — Row Level Security per role
