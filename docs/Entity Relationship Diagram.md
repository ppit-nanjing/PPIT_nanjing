# Entity Relationship Diagram — PPIT Nanjing

> Bagian dari [PPIT Nanjing MOC](./README.md). Kolom lengkap tiap entitas ada di [Data Dictionary](./Data%20Dictionary.md). **Sumber kebenaran = `src/db/schema.ts`** (58 tabel). Diagram dipecah per domain karena satu ERD utuh sudah tidak terbaca.

Audit terakhir terhadap `schema.ts`: **2026-09-09.**

## Peta domain

| # | Domain | Entitas inti | Layar / flow |
|---|---|---|---|
| 1 | **Identitas & Akses** | `users`, `roles`, `sensus_profiles`, `accounts`, `sessions`, `password_reset_tokens` | [Homepage & Login](./Homepage%20&%20Login.md), [Sensus Profile Flow](./Sensus%20Profile%20Flow.md), [User & Role Management](./User%20&%20Role%20Management.md) |
| 2 | **Organisasi** | `departments`, `department_members`, `audit_logs`, `organization_documents`, `regional_branches`, `branch_universities`, `coverage_cities` | [Organization Management](./Organization%20Management.md), [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md) |
| 3 | **Events** | `events`, `event_registrations`, `event_fee_options`, `event_questions`, `event_divisions`, `event_committee`, `event_volunteers`, `certificates` | [Event Flow](./Event%20Flow.md), [Event Management](./Event%20Management.md) |
| 4 | **Konten, Karir & Keanggotaan** | `news_articles`, `gallery_albums`, `gallery_photos`, `job_postings`, `job_applications`, `career_guide_articles`, `mentorship_applications`, `recruitment_periods`, `membership_applications`, `membership_form_fields`, `membership_form_meta` | [Content Pages](./Content%20Pages.md), [Career Flow](./Career%20Flow.md), [Join Us Flow](./Join%20Us%20Flow.md) |
| 5 | **Inventaris & Peminjaman** | `inventory_items`, `borrow_requests`, `item_reservations`, `item_contributions`, `procurement_requests`, `external_loans`, `inventory_audit_logs` | [Equipment Lending Flow](./Equipment%20Lending%20Flow.md), [Inventory Management](./Inventory%20Management.md) |
| 6 | **Platform, Katalog & Konten Kota** | `notifications`, `notification_templates`, `reports`, `help_articles`, `release_notes`, `feedback`, `short_links`, `management_periods`, `drive_folders`, `merchandise`, `sponsors`, `donations`, `donation_channels`, `places`, `universities`, `districts` | [Reports & Analytics](./Reports%20&%20Analytics.md), [Documentation & Help Center](./Documentation%20&%20Help%20Center.md), Catalogue |

⚠️ **Tabel mati:** `permissions` + `role_permissions` ada di schema tapi **tidak pernah di-query**. Otorisasi admin memakai `roles.access_tier` + `departments.grants_full_admin_access` + `departments.admin_module_scope`. Jangan bangun fitur baru di atasnya tanpa memutuskan ulang. `verification_tokens` = milik adapter Auth.js, bukan aplikasi.

---

## 1. Identitas & Akses

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned to"
    USERS ||--o| SENSUS_PROFILES : completes
    USERS ||--o{ ACCOUNTS : "Google OAuth (Auth.js)"
    USERS ||--o{ SESSIONS : "Auth.js"
    USERS ||--o{ PASSWORD_RESET_TOKENS : requests

    USERS {
        uuid id PK
        string email UK
        string password_hash "bcrypt, null utk akun Google-only"
        uuid role_id FK
        enum status "invited / active / inactive / suspended"
        bool email_subscribed "null = belum ditanya"
        string locale "id / en, null = belum pilih"
    }
    ROLES {
        uuid id PK
        string name UK
        enum access_tier "full / scoped / advisory"
    }
    SENSUS_PROFILES {
        uuid id PK
        uuid user_id FK,UK
        string passport_number UK "kunci identitas 1 orang = 1 baris"
        string branch
        string university
        enum completion_status "incomplete / complete"
    }
    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK "sha256; token mentah cuma di email"
        timestamp expires_at "1 jam, sekali pakai"
    }
```

- `USERS` **adalah** tabel `users` Auth.js sekaligus (adapter Drizzle). `accounts` / `sessions` / `verification_tokens` dipakai adapter; `password_reset_tokens` tabel terpisah buatan aplikasi untuk alur "lupa password" email/password.
- `SENSUS_PROFILES` di-UNIQUE lewat `passport_number`, bukan cuma `user_id` — satu orang bisa punya dua akun Google dan mengisi sensus dua kali.

## 2. Organisasi

```mermaid
erDiagram
    DEPARTMENTS ||--o{ DEPARTMENTS : "parent of"
    DEPARTMENTS ||--o{ DEPARTMENT_MEMBERS : has
    USERS ||--o{ DEPARTMENT_MEMBERS : "member of"
    DEPARTMENTS |o--o| USERS : "head"
    DEPARTMENTS |o--o{ ORGANIZATION_DOCUMENTS : owns
    USERS ||--o{ ORGANIZATION_DOCUMENTS : publishes
    USERS ||--o{ AUDIT_LOGS : "actor for"
    REGIONAL_BRANCHES ||--o{ BRANCH_UNIVERSITIES : lists

    DEPARTMENTS {
        uuid id PK
        uuid parent_department_id FK "self, kedalaman bebas"
        uuid head_user_id FK
        bool grants_full_admin_access "true HANYA Divisi Teknologi"
        string admin_module_scope "modul yg dilihat anggota scoped"
    }
    DEPARTMENT_MEMBERS {
        uuid user_id PK,FK
        uuid department_id PK,FK
        string position
    }
    REGIONAL_BRANCHES {
        uuid id PK
        string city_name
        enum region "north / east / south / central / west"
        int member_count "NULL di semua 32 baris"
    }
    BRANCH_UNIVERSITIES {
        uuid id PK
        uuid branch_id FK
        string name "selalu nama Inggris (bentuk yg direkap pusat)"
    }
    COVERAGE_CITIES {
        uuid id PK
        string slug UK "cocok dgn nanjing-coverage.geo.json"
        string label
        int member_count
    }
```

- `REGIONAL_BRANCHES` (32 cabang PPI se-Tiongkok) **tidak** FK ke `departments` (struktur kabinet Nanjing sendiri) — skop beda. `BRANCH_UNIVERSITIES` (±349 kampus) mengisi dropdown bertingkat Cabang→Universitas di form sensus.
- `COVERAGE_CITIES` (9 kota naungan PPIT Nanjing) berdiri sendiri, tanpa FK — batas wilayahnya statis di `src/data/nanjing-coverage.geo.json`.

## 3. Events

```mermaid
erDiagram
    EVENTS ||--o{ EVENT_REGISTRATIONS : has
    EVENTS ||--o{ EVENT_FEE_OPTIONS : "kategori tarif"
    EVENTS ||--o{ EVENT_QUESTIONS : "pertanyaan kustom"
    EVENTS ||--o{ EVENT_DIVISIONS : "pohon kepanitiaan"
    EVENTS ||--o{ EVENT_COMMITTEE : staffed
    EVENTS ||--o{ EVENT_VOLUNTEERS : recruits
    EVENTS |o--o{ CERTIFICATES : issues
    USERS ||--o{ EVENT_REGISTRATIONS : registers
    EVENT_FEE_OPTIONS |o--o{ EVENT_REGISTRATIONS : "kategori dipilih"
    EVENT_DIVISIONS ||--o{ EVENT_DIVISIONS : "parent of"
    EVENT_DIVISIONS |o--o{ EVENT_COMMITTEE : groups
    EVENT_DIVISIONS |o--o{ EVENT_VOLUNTEERS : "dilamar"
    USERS ||--o{ EVENT_COMMITTEE : serves
    USERS ||--o{ CERTIFICATES : holds

    EVENTS {
        uuid id PK
        string slug UK
        enum status "draft / scheduled / published / registration_closed / completed / cancelled"
        bool is_paid
        int fee_cny "null = belum diputuskan"
        timestamp early_bird_until "null = tanpa tahap early bird"
        int capacity
        bool requires_sensus
        bool requires_biodata "form biodata lengkap (mis. WIF)"
        uuid department_id FK
    }
    EVENT_REGISTRATIONS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        enum status "pending / confirmed / attended / cancelled"
        string qr_code_token UK "terbit saat confirmed"
        enum payment_status "not_required / unpaid / submitted / verified / rejected"
        uuid fee_option_id FK
        json biodata_json "snapshot, hanya utk requires_biodata"
        json answers_json "jawaban event_questions"
    }
    EVENT_FEE_OPTIONS {
        uuid id PK
        uuid event_id FK
        string label
        int amount_cny
        int early_bird_amount_cny "null = kategori ini tanpa diskon"
        int quota "null = hanya events.capacity yg berlaku"
    }
    EVENT_DIVISIONS {
        uuid id PK
        uuid event_id FK
        uuid parent_division_id FK "self"
        string name "teks bebas, per acara"
        int quota
    }
    EVENT_COMMITTEE {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        uuid division_id FK
        enum role "ketua / wakil / sekretaris / bendahara / supervisor / anggota / ..."
        string attendance_token UK "QR absensi panitia, dibuat lazily"
    }
    CERTIFICATES {
        uuid id PK
        uuid user_id FK
        uuid event_id FK
        enum kind "peserta / panitia / pemateri / lainnya"
        string file_url "boleh tautan Google Drive"
    }
```

- **`EVENT_COMMITTEE` terpisah dari `DEPARTMENT_MEMBER`**: kepanitiaan per-acara, bukan per-kabinet (bendahara acara ≠ bendahara kabinet). `EVENT_DIVISIONS` bernama teks bebas — tiap acara punya susunan sendiri.
- **Tarif dibaca live, tidak di-snapshot.** Tier early-bird diturunkan dari `event_registrations.registered_at` vs `events.early_bird_until` — memundurkan tanggal ikut menggeser harga pendaftar lama (sengaja).
- `EVENT_VOLUNTEERS` = lamaran dari orang yang **belum tentu punya akun**; saat diterima, dibuatkan akun undangan lalu ditugaskan ke `EVENT_COMMITTEE`.
- `GALLERY_ALBUMS` dan `ITEM_RESERVATIONS` juga menunjuk ke `events` — lihat domain 4 & 5.

## 4. Konten, Karir & Keanggotaan

```mermaid
erDiagram
    USERS ||--o{ NEWS_ARTICLES : authors
    GALLERY_ALBUMS ||--o{ GALLERY_PHOTOS : contains
    USERS ||--o{ GALLERY_PHOTOS : uploads
    EVENTS |o--o{ GALLERY_ALBUMS : "documented by"
    USERS ||--o{ JOB_POSTINGS : posts
    JOB_POSTINGS ||--o{ JOB_APPLICATIONS : receives
    USERS ||--o{ JOB_APPLICATIONS : submits
    USERS ||--o{ CAREER_GUIDE_ARTICLES : authors
    USERS ||--o{ MENTORSHIP_APPLICATIONS : submits
    RECRUITMENT_PERIODS ||--o{ MEMBERSHIP_APPLICATIONS : governs
    USERS |o--o{ MEMBERSHIP_APPLICATIONS : "converts to"

    NEWS_ARTICLES {
        uuid id PK
        string slug UK
        enum status "draft / published / archived"
        uuid author_id FK
    }
    GALLERY_ALBUMS {
        uuid id PK
        uuid event_id FK
        string drive_url "set foto lengkap"
    }
    GALLERY_PHOTOS {
        uuid id PK
        uuid album_id FK
        bool is_highlight "hanya highlight yg tampil publik"
    }
    JOB_APPLICATIONS {
        uuid id PK
        uuid job_id FK
        uuid user_id FK
        enum status "submitted / under_review / interview / offered / rejected"
    }
    MENTORSHIP_APPLICATIONS {
        uuid id PK
        uuid user_id FK
        enum status "pending / matched / rejected"
    }
    RECRUITMENT_PERIODS {
        uuid id PK
        bool is_open
        string batch_label
    }
    MEMBERSHIP_APPLICATIONS {
        uuid id PK
        uuid recruitment_period_id FK
        uuid user_id FK "null kalau anonim"
        enum status "pending / reviewed / accepted / rejected"
        json responses "field kustom di luar kolom inti"
    }
```

- Form Join Us bisa dikonfigurasi admin lewat `membership_form_fields` (per-field) + `membership_form_meta` (setelan satu-baris: judul, kuis mode, shuffle, dll) — keduanya **tidak** FK-linked, dibaca sebagai config.
- `CAREER_GUIDE_ARTICLES` strukturnya sama dengan `news_articles` minus enum status.

## 5. Inventaris & Peminjaman

```mermaid
erDiagram
    INVENTORY_ITEMS ||--o{ BORROW_REQUESTS : "dipinjam via"
    INVENTORY_ITEMS ||--o{ ITEM_RESERVATIONS : "diblokir oleh"
    INVENTORY_ITEMS ||--o{ EXTERNAL_LOANS : "dipinjamkan keluar"
    INVENTORY_ITEMS ||--o{ INVENTORY_AUDIT_LOGS : tracks
    USERS |o--o{ BORROW_REQUESTS : "peminjam internal"
    USERS ||--o{ ITEM_CONTRIBUTIONS : "sumbang / pinjamkan"
    USERS ||--o{ PROCUREMENT_REQUESTS : "usul barang baru"
    EVENTS |o--o{ ITEM_RESERVATIONS : reserves

    INVENTORY_ITEMS {
        uuid id PK
        int total_quantity
        int available_quantity
        enum condition "new / good / fair / damaged / retired"
        string custodian "PEMEGANG"
    }
    BORROW_REQUESTS {
        uuid id PK
        uuid item_id FK
        uuid user_id FK "NULL = peminjam eksternal"
        string borrower_name "diisi utk eksternal"
        string statement_url "Pernyataan Peminjam bertanda tangan"
        enum status "pending / approved / rejected / borrowed / returned / overdue"
        timestamp return_requested_at
    }
    ITEM_CONTRIBUTIONS {
        uuid id PK
        uuid user_id FK
        enum contribution_type "donate / lend_to_org"
        enum status "pending / approved / rejected"
    }
    PROCUREMENT_REQUESTS {
        uuid id PK
        uuid user_id FK
        enum urgency "low / medium / high"
        enum status "pending / approved / rejected / fulfilled"
    }
    EXTERNAL_LOANS {
        uuid id PK
        uuid item_id FK
        string borrower_name "pihak luar, bukan FK"
        enum condition_out
        enum condition_in "diisi saat kembali"
        enum status "active / returned / overdue"
    }
    ITEM_RESERVATIONS {
        uuid id PK
        uuid item_id FK
        uuid event_id FK
        date reserved_from
        date reserved_to
        enum status "active / released"
    }
```

- Empat pintu masuk barang: **pinjam** (`borrow_requests`, internal login atau eksternal tanpa akun), **sumbang/pinjamkan ke PPIT** (`item_contributions`, jadi milik PPIT hanya setelah admin approve → `inventory_items`), **usul pengadaan** (`procurement_requests`), **PPIT pinjamkan asetnya keluar** (`external_loans`, aksi admin).
- `ITEM_RESERVATIONS` memblokir seluruh aset di rentang tanggal karena akan dipakai acara.

## 6. Platform, Katalog & Konten Kota

```mermaid
erDiagram
    USERS ||--o{ NOTIFICATIONS : receives
    NOTIFICATION_TEMPLATES |o--o{ NOTIFICATIONS : "rendered from"
    USERS ||--o{ REPORTS : generates
    USERS ||--o{ HELP_ARTICLES : authors
    USERS ||--o{ RELEASE_NOTES : publishes
    USERS |o--o{ FEEDBACK : submits
    USERS |o--o{ DONATIONS : reports
    MANAGEMENT_PERIODS ||--o{ SHORT_LINKS : groups
    MANAGEMENT_PERIODS ||--o{ DRIVE_FOLDERS : scopes
    DEPARTMENTS |o--o{ DRIVE_FOLDERS : "owns folder"

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid template_id FK "null = teks langsung"
        bool is_read
        string related_entity_type
    }
    REPORTS {
        uuid id PK
        enum type "event_attendance / inventory_audit / sensus_summary / student_export / custom"
        json parameters_json
        string file_url
    }
    FEEDBACK {
        uuid id PK
        enum category "bug / design / feature / general"
        enum status "new / in_review / resolved"
        uuid user_id FK "null = belum login"
        string page_path
        json element_rect "element picker"
    }
    SHORT_LINKS {
        uuid id PK
        string slug UK
        string target_url
        uuid management_period_id FK
        int click_count
    }
    DRIVE_FOLDERS {
        uuid id PK
        uuid management_period_id FK
        uuid department_id FK "null = folder tingkat periode"
        string drive_folder_id
    }
    DONATIONS {
        uuid id PK
        uuid user_id FK
        enum status "pending / verified / rejected"
        string proof_url "diverifikasi admin manual"
    }
```

- **Tabel referensi tanpa FK** (dikelola admin, tidak saling terkait): `merchandise`, `sponsors`, `donation_channels`, `places`, `universities`, `districts`. Kolom `*_en` di beberapa di antaranya diisi otomatis oleh Groq (`translateFields()` di `lib/groq.ts`).
- `REPORTS` generik: 4 jenis laporan (`event_attendance`, `inventory_audit`, `sensus_summary`, `student_export`) dibedakan lewat `type` + `parameters_json`, bukan 4 tabel.
- `AUDIT_LOGS` (jejak perubahan data, otomatis) ≠ `RELEASE_NOTES` (catatan rilis fitur, ditulis manual).

---

## Keputusan Desain Data

- **`USERS` = tabel `users` Auth.js.** Password bcrypt, session JWT, OAuth Google ditangani Auth.js v5. Lihat [Tech Stack](./Tech%20Stack.md).
- **Tanpa tabel `MEDIA` polymorphic.** URL gambar/berkas disimpan langsung sebagai kolom string (`image_url`, `cover_image_url`, `file_url`) di tabel pemilik, menunjuk ke Vercel Blob. Pilihan sadar untuk kesederhanaan.
- **`EVENT_COMMITTEE` terpisah dari `DEPARTMENT_MEMBER`** — kepanitiaan per-acara, bukan per-kabinet.
- **`CERTIFICATES` dicatat, bukan digenerate** — file dibuat di luar aplikasi (boleh tautan Drive), penerbitan manual per acara.
- **Pembayaran & donasi tidak menyentuh uang** — `payment_*` di `EVENT_REGISTRATIONS` dan seluruh `DONATIONS` memodelkan verifikasi bukti transfer manual oleh bendahara/admin. Alipay/WeChat Pay butuh merchant account berbadan hukum Tiongkok; QR pribadi tidak punya webhook.
- **Kontrol akses di application layer**, bukan Postgres RLS — `roles.access_tier` + `departments.admin_module_scope`, dicek di `src/lib/admin-scope.ts`.

## Terkait

- [Data Dictionary](./Data%20Dictionary.md) — kolom lengkap tiap entitas + enum values
- [Tech Stack](./Tech%20Stack.md)
