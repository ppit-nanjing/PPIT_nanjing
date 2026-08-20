# Migrasi ke `nanjing.ppitiongkok.com`

Status: **belum dimulai** — menunggu persetujuan & akses DNS dari PPI Tiongkok pusat.
Ditulis 2026-08-18.

## Ringkasan temuan (hasil pengecekan DNS langsung, bukan asumsi)

| Fakta | Nilai | Artinya buat kita |
|---|---|---|
| Nameserver `ppitiongkok.com` | `ns-cloud-a1..a4.googledomains.com` | DNS dikelola di **Google Cloud DNS**, bukan di Vercel |
| `www.ppitiongkok.com` | CNAME → `ddd503aacc2b749d.vercel-dns-017.com` | Situs pusat **juga di Vercel** |
| Apex `ppitiongkok.com` | `216.198.79.1` (IP Vercel) | idem |
| Subdomain cabang | `nanjing`, `beijing`, `shanghai`, `wuhan`, dll. **belum ada** | Nanjing jadi cabang pertama yang punya subdomain |
| SPF apex | `v=spf1 include:_spf.firebasemail.com ~all` | Pusat kirim email lewat **Firebase**. Jangan diutak-atik |
| DMARC apex | `p=none; adkim=s; aspf=r` | Mode monitoring. `adkim=s` = DKIM harus *strict aligned* |
| `_vercel` TXT | belum ada | Belum pernah ada tim Vercel lain yang pakai domain ini |
| Vercel project pusat | **bukan** di tim `fx-4s-projects` | Kita tidak punya akses; harus minta ke pusat |

## Kode: tidak ada yang perlu diubah

Sudah diperiksa — app ini **domain-agnostic**:

- Tidak ada URL `*.vercel.app` yang di-hardcode di `src/`
- Tidak ada `metadataBase`, `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, atau `NEXTAUTH_URL`
- Tidak ada `sitemap.ts` / `robots.ts`
- Tidak ada `openGraph` / `twitter` metadata
- Auth.js v5 menyimpulkan host dari request (Vercel di-trust otomatis)

Jadi migrasi ini **murni urusan DNS + konfigurasi**, bukan coding.

## Langkah, berurutan

### 1. Tambahkan domain di Vercel (dilakukan oleh kita)

Vercel → project `ppit-nanjing` → Settings → Domains → Add → `nanjing.ppitiongkok.com`.

Vercel akan menolak verifikasi otomatis (karena apex-nya milik akun Vercel lain) dan
menampilkan **record persis** yang dibutuhkan — biasanya:

- `CNAME` pada `nanjing` → target `*.vercel-dns-***.com` milik project kita
- `TXT` pada `_vercel` → token verifikasi kepemilikan

> Jangan menyalin nilai dari dokumen ini — **selalu pakai nilai yang Vercel tampilkan**,
> karena target CNAME sekarang unik per-project (lihat milik pusat: `ddd503aacc2b749d.…`).

### 2. Minta pusat memasang record tersebut

Draf pesan ada di bawah. Pusat memasangnya di Google Cloud DNS.

### 3. Setelah subdomain aktif — update Google OAuth

Google Cloud Console → APIs & Services → Credentials → OAuth client yang dipakai
(`AUTH_GOOGLE_ID`) → **Authorized redirect URIs**, tambahkan:

```
https://nanjing.ppitiongkok.com/api/auth/callback/google
```

Biarkan URI `*.vercel.app` yang lama tetap ada sampai migrasi benar-benar selesai,
supaya login tidak putus di tengah jalan.

### 4. Email: verifikasi subdomain di Resend

Ini alasan utama migrasi ini berharga. Resend hanya mau mengirim ke sembarang penerima
kalau domainnya terverifikasi — dan sekarang kita punya domain.

Resend → Domains → Add → `nanjing.ppitiongkok.com`. Resend memberi 3 record:

| Tipe | Nama | Isi |
|---|---|---|
| MX | `send.nanjing` | `feedback-smtp.<region>.amazonses.com` (prioritas 10) |
| TXT | `send.nanjing` | `v=spf1 include:amazonses.com ~all` |
| TXT | `resend._domainkey.nanjing` | kunci publik DKIM (panjang) |

**Penting dan jadi argumen kuat saat minta izin ke pusat:** semua record ini berada
**di bawah subdomain kita**, bukan di apex. SPF Firebase, DMARC, dan Google Search
Console milik pusat **tidak tersentuh sama sekali**.

Catatan soal DMARC: kebijakan pusat `adkim=s` (strict) diwarisi subdomain karena tidak
ada `sp=`. DKIM dari Resend ditandatangani pada `nanjing.ppitiongkok.com` sehingga
*aligned*. Lagi pula `p=none`, jadi tidak ada yang ditolak — tapi tetap harus benar
supaya laporan DMARC pusat tidak penuh kegagalan atas nama kita.

### 5. Pindahkan pengiriman email dari Gmail ke Resend

Di Vercel, set:

```
EMAIL_FROM=PPIT Nanjing <no-reply@nanjing.ppitiongkok.com>
```

⚠️ **Hapus `GMAIL_USER` dan `GMAIL_APP_PASSWORD`.** Lihat `src/lib/email.ts`:
Gmail sengaja diprioritaskan di atas Resend, jadi selama dua-duanya terisi, email
tetap dikirim lewat Gmail dan `EMAIL_FROM` diabaikan.

Cara memastikan berhasil: buka halaman detail salah satu pendaftar. Kalau sudah benar,
di bawah dropdown Status tertulis alamat pengirim `no-reply@nanjing.ppitiongkok.com`
— bukan kotak peringatan merah.

### 6. Terakhir — jadikan domain baru sebagai primary

Di Vercel → Domains, set `nanjing.ppitiongkok.com` sebagai **Primary**. Vercel akan
otomatis me-redirect `ppit-nanjing.vercel.app` ke sana, jadi tautan lama tidak mati.

---

## Draf permintaan ke PPI Tiongkok pusat

> Halo Tim IT PPI Tiongkok,
>
> PPIT Nanjing sudah punya portal web sendiri (pendaftaran anggota, kegiatan,
> inventaris, sensus) yang saat ini jalan di `ppit-nanjing.vercel.app`. Kami ingin
> memindahkannya ke subdomain resmi: **`nanjing.ppitiongkok.com`**.
>
> Kami perhatikan situs pusat juga sudah berjalan di Vercel, jadi prosesnya cukup
> menambahkan beberapa record di Google Cloud DNS. Kami tidak meminta akses ke DNS —
> cukup dibantu pasang record berikut:
>
> **A. Untuk situsnya**
> _(nilai persis akan kami kirim dari dashboard Vercel — berupa satu CNAME pada
> `nanjing` dan satu TXT pada `_vercel` untuk verifikasi kepemilikan)_
>
> **B. Untuk pengiriman email pengumuman hasil seleksi anggota**
> _(tiga record dari Resend: satu MX dan satu TXT pada `send.nanjing`, serta satu TXT
> DKIM pada `resend._domainkey.nanjing`)_
>
> Yang ingin kami tegaskan: **seluruh record berada di bawah subdomain `nanjing`.**
> Konfigurasi email pusat yang sudah ada — SPF Firebase (`_spf.firebasemail.com`),
> DMARC, dan verifikasi Google Search Console di domain utama — tidak kami sentuh
> dan tidak akan terpengaruh.
>
> Kalau ada standar penamaan subdomain atau prosedur tersendiri di pusat, mohon
> arahannya — kami ikut aturan pusat.
>
> Terima kasih banyak.

## Hal yang belum terjawab

1. **Apakah pusat punya kebijakan penamaan subdomain?** Kita asumsikan `nanjing.`,
   tapi bisa saja pusat maunya `nanjing.cabang.ppitiongkok.com` atau semacamnya.
   Tanyakan sebelum menambahkan domain di Vercel, supaya tidak perlu diulang.
2. **Siapa yang pegang Google Cloud DNS di pusat?** Menentukan berapa lama prosesnya.
3. **Opsional, belum dikerjakan:** setelah domain final, ada baiknya menambahkan
   `metadataBase` + `openGraph` di `src/app/layout.tsx` supaya preview tautan di
   WhatsApp/Instagram menampilkan kartu yang benar. Sekarang belum ada sama sekali,
   jadi ini peningkatan baru — bukan sesuatu yang rusak karena migrasi.
