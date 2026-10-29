# Formulir Kustom

> Dibangun 29 Okt 2026. Formulir buatan sendiri ala Google Forms untuk riset pasar, kuesioner, atau pengumpulan masukan. Judul, deskripsi, dan pertanyaannya bebas ditentukan pembuat. **Nama di kode: `survei`** (nilai enum `form_kind`, berkas `survey*.ts`, komponen `Survey*`). Nama produk yang dilihat pengguna adalah **Formulir Kustom**.

Jangan tertukar dengan [Formulir & Oprek](./Formulir%20&%20Oprek.md): itu formulir internal kabinet (Pemilu, Oprek) dengan lamaran, status, dan penempatan panitia. Formulir Kustom hanya mengumpulkan jawaban.

## Ringkasan

| | |
|---|---|
| Halaman pembuat | `/formulir` (daftar dan buat), `/formulir/[formId]` (tab Pertanyaan, Hasil, Pengaturan) |
| Halaman pengisi | `/f/[id]` (jalur pendek untuk dibagikan di grup WeChat), `/f/[id]/terkirim` |
| Siapa yang membuat | Pengurus kabinet (punya baris `department_members`), panitia acara (peran apa pun) untuk acaranya, dan pemegang full/modul `forms` |
| Siapa yang melihat hasil | Pembuat (selama masih pengurus kabinet / panitia acaranya), BPH Panitia acara terikatnya, pemegang full/modul `forms` |
| Siapa yang mengisi | Pilihan per formulir: **wajib login** (bawaan, satu akun satu jawaban) atau **boleh tanpa login** |
| Hasil | Grafik per pertanyaan, tabel, Google Sheet langsung, unduhan CSV dan Excel (waktu **jam Tiongkok, CST**) |

Menunya ada di sidebar konsol ("Formulir Kustom") dan di menu akun (untuk pengurus kabinet yang tidak masuk konsol). **Sengaja di luar `/console`**: layout konsol hanya menerima admin, koordinator, dan panitia, dan dashboard konsol menampilkan data (pesan masukan, nama pendaftar) yang tidak untuk semua pengurus kabinet. Gerbang masuk konsol tidak dilonggarkan.

## Data (migrasi `0057_survei.sql`)

- `form_kind` += `survei`. Memakai tabel **`forms`** dan **`form_fields`** yang sama dengan Oprek/Pemilu, jadi builder pertanyaan (19 jenis, kecuali unggahan) dipakai ulang. `event_id` boleh NULL (khusus kabinet) atau terisi (terikat acara). Indeks unik `(kind, event_id)` dilonggarkan: **satu acara boleh punya banyak formulir kustom**.
- `forms.allow_public` (boleh diisi tanpa login) dan `forms.collect_biodata` (minta biodata responden).
- **`form_responses`**: satu baris per pengisi. `user_id` (NULL untuk pengisi publik, unik per `(form_id, user_id)`; `ON DELETE CASCADE`, jadi biodata yang memuat nama ikut terhapus bersama akunnya), `biodata` (jsonb `{fullName, university, city}`), `biodata_source` (`sensus` | `manual`), `answers` (jsonb per `form_fields.key`; grid sebagai `{indeksBaris: nilai}`, multiselect sebagai array, checkbox sebagai boolean, skala dan angka sebagai angka), `submitted_at`.
- Migrasi **harus diterapkan ke produksi sebelum kode dirilis**: kolom baru di `forms` dibaca oleh setiap query `select *` dari tabel itu. `npm run check:drift` memeriksanya.

## Pertanyaan

Builder yang sama dengan Oprek (`FormFieldEditor`, `QuestionBank`, aksi `createFormField`/`updateFormField`/dst. di `src/app/actions/forms.ts`). Perbedaan untuk formulir kustom:

- **Tidak ada unggahan berkas/gambar** (`SURVEY_BLOCKED_TYPES`). Pengisi publik tidak punya akun untuk mengunggah, dan berkas formulir punya aturan akses sendiri yang hanya mengenal lamaran Oprek. Dipilah di tiga lapis: tidak tampil di pilihan builder dan bank pertanyaan, ditolak server saat membuat/mengubah, dan diabaikan saat menampilkan dan menerima jawaban.
- Pertanyaan yang diubah atau dihapus setelah ada jawaban: jawaban lama tetap tersimpan di `answers`, tetapi tidak tampil lagi di ringkasan, tabel, dan ekspor.

## Mengisi

`submitSurvey` (`src/app/actions/survey.ts`) memeriksa ulang semuanya di server:

1. Formulir ada dan berjenis kustom; acara terikatnya tidak di Sampah.
2. Login atau publik: tanpa login hanya kalau `allow_public`. Akun `suspended` ditolak.
3. Satu akun satu jawaban (cek sebelum cek buka/tutup, supaya yang sudah mengisi tetap melihat konfirmasinya; plus indeks unik untuk balapan).
4. Status buka (`surveyOpenState`): `is_open` adalah sakelar utama, lalu `opens_at`/`closes_at` **ditegakkan** (berbeda dari Oprek, tempat tanggal hanya informasi).
5. Pengisi publik: kolom jebakan bot (`website`), pembatas per IP di memori instance (30 per 10 menit, longgar karena kampus di Tiongkok berbagi IP keluar), dan pembatas per formulir dari database (150 per 10 menit, 5000 total).
6. `parseSurveyAnswers` (`src/lib/survey.ts`): wajib, pilihan harus salah satu opsi yang ada, rentang skala dan angka, format email/telepon/URL (hanya http/https)/tanggal/jam, batas panjang (teks 500, paragraf 5000), karakter NUL dibuang (jsonb menolaknya).

### Biodata

Kalau `collect_biodata` menyala:

- Akun yang sensusnya **lengkap**: nama, universitas, dan kota (cabang) **diambil dari sensus di server** dan tampil hanya-baca. Hanya tiga isian itu yang disalin. Paspor, telepon, jenis kelamin, dan data sensus lain tidak pernah ikut.
- Akun yang sensusnya belum lengkap, atau pengisi publik: mengisi sendiri (nama wajib, dua lainnya boleh kosong). Dicek di klien (supaya jawaban tidak hilang) dan di server.

**Ajakan sensus.** Pengisi yang mengisi biodata sendiri dengan kota Nanjing (`isNanjingCity`: "Nanjing", "Nanking", atau 南京) berarti belum tercatat di sensus. Setelah mengirim, `submitSurvey` mengarahkan ke `/f/[id]/terkirim?sensus=1`, dan halaman itu menampilkan kartu ajakan: tombol "Isi sensus sekarang" untuk yang sudah login (kembali ke halaman terkirim sesudahnya), atau "Buat akun" dan "Masuk" (lalu langsung ke `/sensus`) untuk pengisi publik. Bendera `?sensus=1` hanya menampilkan tautan dan tidak membuka apa pun; yang ternyata sudah sensus lengkap tidak diajak lagi. Untuk kota lain tidak ada ajakan.

Kalau `collect_biodata` mati, nama tidak ditampilkan di hasil. Untuk formulir wajib login, `user_id` tetap disimpan (dasar satu akun satu jawaban) tetapi **tidak pernah dipilih** oleh halaman hasil, ekspor, maupun Sheet. Halaman isi menyampaikannya ke pengisi.

## Hasil

Pembuat melihat jawaban di **`/formulir`** (menu "Formulir Kustom" di sidebar konsol atau menu akun): tiap kartu formulir menampilkan jumlah jawabannya, dan membukanya membawa ke `/formulir/[formId]`. Tab **Hasil** (dengan lencana jumlah jawaban) berisi ringkasan, tabel, Google Sheet, dan unduhan. Belum ada notifikasi saat jawaban baru masuk.

Tab **Hasil** di `/formulir/[formId]`:

- **Ringkasan** (`buildSurveyResults`): pilihan sebagai donat (≤ 6 opsi) atau batang, skala dengan rata-rata dan sebaran penuh, angka dengan rata-rata/terendah/tertinggi, teks bebas sebagai daftar 30 jawaban terbaru, grid per baris.
- **Tabel** (`DataTable`): cari, urut, filter, pilih kolom, salin. Kolom dan baris persis sama dengan berkas unduhan (`buildSurveyDataset`, satu sumber).
- **Unduh CSV / Excel**: `/api/formulir/[formId]/export?format=csv|xlsx`. Kolom waktu berlabel **"(jam Tiongkok CST, UTC+8)"** dan nilainya jam Tiongkok. Awalan rumus (`= + - @`) dinetralkan di CSV.
- **Google Sheets**: tombol "Ke Google Sheets" di tabel. Dengan `GOOGLE_DRIVE_REFRESH_TOKEN` terisi, server membuat **Google Sheet langsung** (jenis sheet `formulir`), dibagikan ke pengklik sebagai pembaca, dan diperbarui otomatis beberapa detik setelah ada jawaban baru, jawaban dihapus, atau pertanyaan/setelan diubah (`scheduleLiveSheetSync(formId, ["formulir"])`). Tanpa token: mode salin-tempel. Cara kerja lengkap, privasi, dan umur sheet ada di [Tampilan Tabel Konsol](./Tampilan%20Tabel%20Konsol.md#google-sheets). Khusus formulir kustom: kunci sheet adalah **id formulir** (mesinnya hanya butuh UUID), folder Drive bernama judul formulir, dan klik dicatat di jejak audit sebagai entitas `form` (`export.sheet`, batas 6 per 10 menit per pengguna yang sama dengan sheet acara). Sheet formulir yang formulirnya dihapus ikut dibersihkan setelah 30 hari tidak aktif.
- **Hapus jawaban** (jawaban iseng/ganda): hanya pengelola formulir. `formId` dikunci di `WHERE`.
- Memuat paling banyak 5.000 jawaban terbaru (`SURVEY_RESPONSE_LIMIT`); ekspor CSV/Excel sampai 20.000.

## Akses di kode

- `src/lib/survey-access.ts`: `getSurveyAccess`, `requireSurveyHub`, `listSurveyEvents`, `listManageableSurveys`.
- `src/lib/form-access.ts`: `canManageForm` punya cabang untuk jenis kustom (`canManageSurvey`): pembuat **yang masih berhak membuat** (`isSurveyCreatorEligible`), atau BPH Panitia acara terikat; pemegang full/modul `forms` lolos lebih awal. Dipakai halaman kelola, aksi builder, ekspor, dan aksi Sheet.
- Flag sesi `canCreateSurvey` (`src/auth.ts`) hanya untuk menampilkan menu; gerbangnya tetap di halaman dan aksi.
- Halaman, aksi, dan rute Oprek **menolak** formulir kustom: `/forms/[id]` dan `/forms/[id]/submitted` mengalihkan ke `/f/[id]`, `/console/forms/[formId]` ke `/formulir/[formId]`, ekspor Oprek menjawab 404, `submitFormApplication` mengalihkan, `updateFormSettings` dan `deleteForm` memberi 404. `createForm` tidak menerima jenis ini.
- Mesin pencari: `/f/` dan `/formulir` dilarang di `src/app/robots.ts`; halaman isi juga `noindex`. Judul formulir khusus-login tidak dibocorkan ke pratinjau tautan.

## Hal yang sengaja belum ada

- Mengedit jawaban setelah dikirim, batas jumlah jawaban, dan notifikasi ke pembuat saat ada jawaban baru.
- Terjemahan Inggris untuk halaman pembuat dan teks sekitar form isi (pertanyaan buatan pembuat tidak diterjemahkan otomatis). Tombol dan galat bawaan form mengikuti kamus `forms.form.*`.
- Pengisi tanpa login tidak punya batas "satu jawaban per orang": hanya pembatas laju dan kolom jebakan. Untuk pemilihan atau data yang harus unik, pakai formulir wajib login.
