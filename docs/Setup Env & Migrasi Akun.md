# Setup Env & Migrasi Akun ke Gmail PPIT Nanjing

> Dibuat 2026-08-21. Daftar lengkap environment variable + urutan memindahkan seluruh layanan (GitHub, Vercel, Neon, Google Cloud) ke akun Gmail organisasi.
>
> Nilai contoh & komentar per variabel ada di [`.env.example`](../.env.example) — berkas itu yang jadi sumber kebenaran bentuknya. Dokumen ini menjelaskan **dari mana** nilainya diambil dan **di mana** dipasang.

## Kenapa dokumen ini ada

Sebelumnya `.env.example` hanya memuat 11 dari 13 variabel yang benar-benar dibaca kode. Dua yang hilang justru yang paling berdampak: `BLOB_READ_WRITE_TOKEN` (tanpa itu sensus tidak bisa diselesaikan siapa pun) dan `CRON_SECRET` (tanpa itu endpoint cron terbuka untuk umum). Keduanya sudah ditambahkan.

## Tabel lengkap

| Variabel | Status | Diambil dari | Dipasang di |
|---|---|---|---|
| `DATABASE_URL` | **WAJIB** | Neon Console → Project → Connection Details → **Pooled connection** | Vercel + `.env` lokal |
| `AUTH_SECRET` | **WAJIB** | Dibuat sendiri: `npx auth secret` | Vercel + `.env` lokal |
| `AUTH_GOOGLE_ID` | **WAJIB** | Google Cloud Console → APIs & Services → Credentials → OAuth client | Vercel + `.env` lokal |
| `AUTH_GOOGLE_SECRET` | **WAJIB** | Sama, di layar yang sama | Vercel + `.env` lokal |
| `BLOB_READ_WRITE_TOKEN` | **WAJIB untuk sensus** | Vercel → Storage → Blob store → Connect ke project (disuntik otomatis di produksi) | Vercel (otomatis) + `.env` lokal (salin manual) |
| `PRIVATE_READ_WRITE_TOKEN` | **WAJIB untuk dokumen pribadi** | Vercel → Storage → store Blob **Private** (terpisah dari yang publik) → Connect ke project; Vercel menyuntiknya dengan prefix `PRIVATE_` | Vercel (otomatis) + `.env` lokal (salin manual) |
| `CRON_SECRET` | **WAJIB di produksi** | Dibuat sendiri, lihat di bawah | Vercel |
| `MAINTENANCE_MODE` | Opsional | — (isi `"true"`/`"false"`) | Vercel |
| `GROQ_API_KEY` | Opsional | https://console.groq.com/keys | Vercel + `.env` lokal |
| `GMAIL_USER` | Opsional | Alamat Gmail PPIT | Vercel |
| `GMAIL_APP_PASSWORD` | Opsional | https://myaccount.google.com/apppasswords (butuh 2FA aktif) | Vercel |
| `EMAIL_FROM_NAME` | Opsional | — (default "PPIT Nanjing") | Vercel |
| `RESEND_API_KEY` | Opsional | resend.com — **hanya berguna kalau punya domain sendiri** | Vercel |
| `EMAIL_FROM` | Opsional | Alamat di domain yang sudah diverifikasi di Resend | Vercel |

Membuat `CRON_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Dua hal yang bukan cuma "belum diisi"

### 1. `BLOB_READ_WRITE_TOKEN` memblokir sensus, bukan sekadar mematikan unggah

`/api/upload` mengembalikan **503** selama token ini kosong. Kartu Tanda Mahasiswa **wajib** sebelum sensus bisa disimpan sebagai lengkap. Rantainya: tidak ada Blob → tidak ada yang bisa mengunggah kartu → tidak ada sensus yang bisa diselesaikan → **tidak ada data yang bisa disetor ke PPI Tiongkok pusat**.

Ini yang harus dibereskan paling awal, sebelum meminta anggota mengisi sensus.

### 2. `CRON_SECRET` kosong = endpoint ditolak (503) di produksi

Guard bersama ada di `src/lib/cron-auth.ts` (dipakai `/api/cron/publish-events` dan `/api/cron/mark-overdue`). Dulu berbentuk `if (secret) { ...periksa... }`, jadi variabel **kosong = tidak ada pemeriksaan**: pada 2026-10-01 nilainya di Vercel ternyata kosong dan kedua endpoint terbuka untuk siapa pun. Sekarang di produksi (`NODE_ENV=production`, termasuk preview) variabel kosong dijawab **503**, dan nilai yang salah dijawab 401; di lokal tetap boleh kosong. Vercel Cron mengirim `Authorization: Bearer $CRON_SECRET` sendiri begitu variabelnya terisi. Untuk memanggil manual: `curl -H "Authorization: Bearer <nilai>" .../api/cron/mark-overdue` (nilai bertipe sensitive, tidak bisa dibaca ulang dari Vercel; buat nilai baru bila lupa).

Dulu dampaknya dinilai terbatas: `publish-events` hanya menerbitkan acara yang `scheduledPublishAt`-nya memang sudah lewat, dan `mark-overdue` hanya menandai pinjaman yang sudah lewat jatuh tempo (dan memberi tahu peminjamnya). Tetap saja endpoint yang mengubah data tidak boleh bisa dipicu tanpa autentikasi, makanya sekarang dijaga.

Jadwalnya sendiri baru ditambahkan lewat [`vercel.json`](../vercel.json) — sebelumnya berkas itu **tidak ada**, jadi cron-nya tidak pernah berjalan otomatis sama sekali dan publikasi terjadwal diam-diam tidak terjadi.

## Dokumen pribadi: store Blob private

Berkas yang berisi data pribadi tidak boleh punya URL publik, walau URL-nya acak. Semuanya disimpan di store Blob **private** (`PRIVATE_READ_WRITE_TOKEN`) dan hanya dibuka lewat proxy yang memeriksa sesi login:

| Folder upload | Isi | Proxy | Siapa yang boleh membuka |
|---|---|---|---|
| `sensus` | Kartu mahasiswa / LOA sensus | `/api/sensus/student-card/…` | Pemilik; modul `sensus` / `sensus-verify` |
| `payment-proof` | Bukti transfer peserta acara | `/api/files/payment-proof/…` | Pemilik; kapabilitas acara `event.manageFinance`; modul `organization` |
| `event-doc` | Bukti mahasiswa / LOA peserta acara | `/api/files/event-doc/…` | Pemilik; kapabilitas acara `event.viewRegistrants` |
| `resume` | CV pelamar lowongan | `/api/files/resume/…` | Pemilik; modul `career` |
| `membership` | Lampiran form Join Us | `/api/files/membership/…` | Pemilik; modul `membership` |
| `borrow-doc` | Pernyataan Peminjam bertanda tangan | `/api/files/borrow-doc/…` | Pemilik (kalau login); modul `inventory`. Peminjam pihak luar tidak punya akun, jadi hanya Logistik yang membukanya |

Aturan lengkap ada di `src/lib/private-file-access.ts`; daftar folder dan pembantu URL di `src/lib/private-files.ts`. Berkas pengguna yang login disimpan di `<folder>/<userId>/…` (segmen kedua = pemilik); berkas lama hasil migrasi tidak punya segmen itu, jadi pemiliknya dicari lewat baris database yang menyimpannya. Respons proxy `Cache-Control: private, no-store`, dan `?download=1` memaksa unduhan (tombol "Unduh" di konsol). PDF boleh dipratinjau di <iframe> dari situs sendiri (aturan header `/api/files/:path*` di `next.config.ts`).

Unggahan ke folder-folder ini **gagal keras** kalau store private bermasalah, tidak jatuh ke store publik (hanya `sensus` yang masih punya fallback itu, perilaku lama).

CSV ekspor pendaftar memuat URL penuh ke berkas (tetap butuh login pengurus untuk membukanya).

### Memindahkan dokumen lama dari store publik

Sebelum ini folder tersebut ada di store publik. Skrip sekali-jalan `src/db/migrate-private-docs.ts` memindahkannya (jalankan **setelah** proxy `/api/files` terpasang di produksi):

```bash
npx tsx --env-file=.env src/db/migrate-private-docs.ts                   # dry run, tidak menulis apa pun
npx tsx --env-file=.env src/db/migrate-private-docs.ts --apply --limit 2 # coba 2 berkas dulu
npx tsx --env-file=.env src/db/migrate-private-docs.ts --apply           # sisanya
npx tsx --env-file=.env src/db/migrate-private-docs.ts --verify          # cek ulang, hanya baca
npx tsx --env-file=.env src/db/migrate-private-docs.ts --delete-public --yes   # LANGKAH TERAKHIR
```

Tiap berkas diunduh dari store publik, diunggah ke store private dengan pathname yang sama, dibaca balik dan dibandingkan byte per byte (ukuran + sha256) sebelum baris database disentuh; `UPDATE`-nya dijaga nilai lamanya sehingga baris yang berubah di tengah jalan dilewati. Skrip menulis peta URL lama → baru (`private-docs-map-….json`) untuk rollback. `--delete-public` hanya menghapus salinan publik yang kembarannya di store private identik dan tidak lagi dipakai baris database mana pun; tanpa `--yes` ia hanya melaporkan.

## Urutan migrasi akun

Urutannya penting: Neon dulu (datanya), Google Cloud terakhir (paling gampang bikin orang tidak bisa login).

### 1. Neon
1. Buat akun Neon dengan Gmail PPIT.
2. Di akun lama: Project Settings → **Transfer project** ke organisasi/akun baru. Kalau transfer tidak tersedia di paket kamu, alternatifnya `pg_dump`/`pg_restore` ke project baru — tapi `DATABASE_URL` berubah, jadi Vercel harus diperbarui di langkah yang sama.
3. Ambil **Pooled connection string** yang baru.

> Jangan pakai `drizzle-kit push --force` untuk membangun ulang skema di project baru. Pakai berkas migrasi berurutan:
> ```bash
> npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0000_add_event_scheduled_publish.sql
> ```
> …dan seterusnya sampai `0014`. Alasannya ada di `docs/Progress & Handoff.md` gap #9.

### 2. GitHub
1. Repo `Fx-4/PPIT_nanjing` → Settings → **Transfer ownership** ke akun/organisasi PPIT.
2. Vercel akan kehilangan koneksi Git-nya; sambungkan ulang di langkah berikutnya.

### 3. Vercel
1. Buat akun/tim Vercel dengan Gmail PPIT.
2. Import repo yang sudah dipindahkan.
3. Isi **semua** variabel dari tabel di atas (Production + Preview + Development sesuai kebutuhan).
4. Storage → buat **Blob store** → Connect ke project. Ini yang mengisi `BLOB_READ_WRITE_TOKEN` otomatis.
5. Pastikan `vercel.json` terbaca — cron `/api/cron/publish-events` harus muncul di tab Cron Jobs.
6. Domain: pasang ulang subdomain (lihat catatan `Migrasi Subdomain ppitiongkok` di vault Obsidian).

### 4. Google Cloud (paling akhir)
1. Buat project baru di akun Gmail PPIT.
2. APIs & Services → OAuth consent screen → isi (External, publish kalau perlu).
3. Credentials → Create OAuth client ID → Web application.
4. **Authorized redirect URIs** — daftarkan semuanya yang dipakai:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<domain-produksi>/api/auth/callback/google`
   - URL preview Vercel kalau mau login dari sana juga
5. Perbarui `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` di Vercel, lalu redeploy.

### 5. Sesudah semuanya
- **Semua orang akan ter-logout** kalau `AUTH_SECRET` diganti. Itu wajar dan tidak merusak apa pun — akunnya tetap ada, cuma perlu login ulang.
- Akun yang sebelumnya login lewat Google akan tetap ketemu **selama alamat emailnya sama** (`users.email` unik dan itu kuncinya). Ganti Google Cloud project **tidak** membuat akun baru.
- Uji berurutan: login Google → isi sensus sampai selesai (menguji Blob) → unduh Ringkasan Sensus di `/console/reports`.

## Terkait

- [`.env.example`](../.env.example) — bentuk & komentar tiap variabel
- [`Progress & Handoff.md`](./Progress%20&%20Handoff.md) — gap yang masih terbuka, termasuk kenapa `push --force` dihindari
