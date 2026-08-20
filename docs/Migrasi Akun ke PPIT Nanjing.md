# Migrasi Akun ke PPIT Nanjing

Ditulis 2026-08-20, setelah dicek langsung ke tiap layanan.

## Kondisi sekarang: semuanya atas nama pribadi

| Layanan | Pemilik sekarang | Bukti |
|---|---|---|
| GitHub | **Akun pribadi** `Fx-4/PPIT_nanjing` | `isInOrganization: false`, privat |
| Vercel | **Tim pribadi** "fx-4's projects" | Ini tim Hobby bawaan, bukan tim organisasi |
| Neon Postgres | Akun pribadi | `ep-calm-fog-azvupsjt`, region ap-southeast-1 |
| Google Cloud (OAuth) | Akun pribadi | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` |
| Groq (AI Help Center) | Akun pribadi | `GROQ_API_KEY` |
| Resend (email) | Akun pribadi | key sempat bocor di chat — **tetap harus di-rotate** |
| **Domain** | ✅ **Sudah milik organisasi** | `ppitiongkok.com` dikuasai PPI Tiongkok Pusat |

Satu-satunya aset yang sudah aman adalah domainnya, dan itu justru karena dipegang pusat.

## Jawabannya: ya, sebaiknya migrasi — dan sekarang momen termurahnya

Bukan karena ada yang rusak, tapi karena **tiga layanan sedang mau dibuat**:

- Vercel Blob (`BLOB_READ_WRITE_TOKEN`) — belum dibuat
- Pengiriman email (Gmail App Password atau domain Resend) — belum dibuat
- Redirect URI Google OAuth untuk `nanjing.ppitiongkok.com` — belum dibuat

Kalau ketiganya dibuat sekarang di akun pribadi, nanti harus dipindah lagi. Kalau
dibuat langsung di akun PPIT, biayanya nol. **Ongkos migrasi naik tiap kali ada
layanan baru didaftarkan atas nama pribadi.**

> [!important] Urutan penting
> Lakukan migrasi akun **sebelum** menyelesaikan migrasi domain dan setup email.
> Kalau dibalik, konfigurasi Google OAuth dan verifikasi domain Resend harus
> dikerjakan dua kali.

## Kunci utamanya: satu akun Google milik PPIT

Semua layanan di atas mendaftar pakai email. Kalau email itu email pribadi, migrasi
apa pun percuma. Jadi langkah nol:

1. Buat / pastikan ada **satu akun Google milik PPIT Nanjing** (mis. `ppit.nanjing@gmail.com`).
2. Aktifkan **Verifikasi 2 Langkah** di akun itu.
3. **Simpan kode pemulihan (recovery codes)** di tempat yang bisa diakses kepengurusan
   berikutnya — bukan di HP satu orang.
4. Semua layanan berikutnya didaftarkan **dengan akun ini**.

Akun ini sekaligus jadi pengirim email pengumuman (`GMAIL_USER`), jadi memang dibutuhkan.

## Urutan migrasi

### 1. GitHub → Organization (paling mudah, gratis, kerjakan duluan)

Buat GitHub Organization `ppit-nanjing` (plan Free sudah cukup), lalu
**Settings → Transfer ownership** pada repo. Riwayat commit, issue, dan star ikut pindah.

Setelah itu tambahkan penerus sebagai **Owner**, bukan sekadar member — supaya kalau
satu orang hilang, organisasi tidak terkunci.

### 2. Neon → akun/organisasi PPIT

Ini aset yang **paling tidak tergantikan**. Kode bisa di-clone ulang; isi database tidak.

Neon punya fitur Organizations. Perhatikan: memindahkan project mengubah
**connection string**, jadi `DATABASE_URL` di Vercel harus diperbarui di saat yang sama,
atau situs mati.

> Alternatif lebih aman kalau ragu: buat project Neon baru di akun PPIT, lalu
> `pg_dump` / restore. Lebih lambat, tapi bisa diuji dulu sebelum ganti.

### 3. Vercel — ada keputusan biaya di sini

Dua pilihan, dan tidak ada yang sempurna:

| Pilihan | Biaya | Kekurangan |
|---|---|---|
| **Vercel Pro Team** atas nama PPIT | mulai **$20/bulan** | Uang beneran untuk organisasi mahasiswa |
| **Satu akun Hobby bersama** milik PPIT | gratis | Kredensial dipakai bersama — kompromi keamanan |

Kebanyakan organisasi mahasiswa memilih yang kedua. Itu **bisa diterima** asal 2FA aktif
dan kode pemulihannya benar-benar diserahterimakan.

> [!warning] Tapi ada catatan ToS yang relevan dengan fitur kita
> Plan Hobby Vercel **hanya untuk penggunaan non-komersial**. Saat ini kita aman:
> merchandise cuma etalase (tidak ada pembayaran) dan donasi diproses di luar aplikasi.
> **Tapi kalau nanti benar-benar berjualan lewat situs, Hobby jadi melanggar ToS** dan
> harus naik ke Pro.

### 4. Sisanya, daftarkan ulang dengan akun PPIT

Google Cloud (OAuth), Groq, Resend. Ini bukan "pindah" melainkan **buat baru lalu
ganti env var** — lebih cepat daripada transfer, dan sekalian me-rotate kredensial lama.

## Jebakan yang sudah pernah menggigit proyek ini

1. **Vercel menolak deploy kalau email author commit tidak terverifikasi di akun GitHub.**
   Ini pernah terjadi dan memblokir 22 commit. Migrasi akun menyentuh persis hal ini —
   setelah pindah, cek `git config --local user.email` dan pastikan email itu terdaftar
   & terverifikasi di akun GitHub yang baru.
2. **Environment variable tidak ikut pindah.** Semua env di Vercel harus dimasukkan ulang
   secara manual di project baru.
3. **`DATABASE_URL` berubah** kalau Neon dipindah. Ganti bersamaan, jangan terpisah.
4. **Integrasi GitHub↔Vercel putus** saat repo atau project pindah; harus disambungkan ulang.

## Yang sebenarnya paling berisiko: serah terima, bukan teknis

Banyak organisasi berhasil memindahkan akun lalu tetap kehilangan akses — karena
passwordnya cuma ada di kepala satu orang. Sebelum periode berakhir, pastikan ada
**satu dokumen serah terima** berisi:

- Daftar setiap layanan + akun yang memilikinya
- Cara pemulihan tiap akun (recovery code, email cadangan)
- Siapa saja yang berstatus Owner (minimal dua orang)
- Catatan env var apa saja yang harus ada supaya situs hidup

Simpan di tempat milik organisasi — Google Drive PPIT atau password manager bersama —
**bukan** di perangkat pribadi.

## Checklist

- [ ] Buat akun Google PPIT + 2FA + simpan recovery code
- [ ] Buat GitHub Organization, transfer repo, tambahkan ≥2 Owner
- [ ] Putuskan Vercel: Pro berbayar atau Hobby akun bersama
- [ ] Pindahkan/buat ulang project Vercel, masukkan ulang semua env var
- [ ] Pindahkan Neon (atau dump-restore), perbarui `DATABASE_URL` bersamaan
- [ ] Buat ulang OAuth Google, Groq, Resend dengan akun PPIT
- [ ] Rotate key Resend lama (sudah bocor di chat)
- [ ] Cek `git config --local user.email` cocok & terverifikasi di GitHub baru
- [ ] Baru setelah itu: selesaikan migrasi domain + setup email
- [ ] Tulis dokumen serah terima, simpan di Drive PPIT
