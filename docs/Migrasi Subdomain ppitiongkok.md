# Migrasi ke `nanjing.ppitiongkok.com`

Status: nilai DNS baru (project Vercel sudah pindah) — menunggu pusat memasang.
Diperbarui 2026-08-23. (Sumber kebenaran terkini ada di catatan Obsidian
"Projects/PPIT Nanjing/Migrasi Subdomain ppitiongkok.md" — file ini adalah salinannya
di repo supaya tetap bisa diakses tanpa Obsidian.)

Pusat **sudah memberi izin**. Domain **sudah didaftarkan di Vercel**.

> [!warning] Nilai record LAMA di versi dokumen ini sebelumnya sudah tidak berlaku
> Project Vercel sudah dipindah (dari `ppit-nanjing` di akun lama `fx-4s-projects`
> ke project baru — alias `ppit-nanjing-kappa.vercel.app`). Vercel menerbitkan
> **CNAME target unik per project**, jadi begitu project pindah, CNAME lama otomatis
> basi. Nilai di bawah ini sudah ditarik ulang dari panel domain project yang baru
> pada 2026-08-23 — **pakai ini, bukan nilai versi sebelumnya.**

Dicek 2026-08-23 (`nslookup` ke `8.8.8.8`): **kedua record masih belum ada** di DNS
publik — pusat belum memasang.

## Ringkasan temuan (hasil pengecekan DNS langsung, bukan asumsi)

| Fakta | Nilai | Artinya buat kita |
|---|---|---|
| Nameserver `ppitiongkok.com` | `ns-cloud-a1..a4.googledomains.com` | DNS dikelola di **Google Cloud DNS**, bukan di Vercel |
| `www.ppitiongkok.com` | CNAME → `ddd503aacc2b749d.vercel-dns-017.com` | Situs pusat **juga di Vercel** |
| Apex `ppitiongkok.com` | `216.198.79.1` (IP Vercel) | idem |
| Subdomain cabang | `chongqing` sudah ada; `nanjing`, `beijing`, `shanghai`, `wuhan`, dll. **belum** | Nanjing jadi cabang kedua yang punya subdomain |
| SPF apex | `v=spf1 include:_spf.firebasemail.com ~all` | Pusat kirim email lewat **Firebase**. Jangan diutak-atik |
| DMARC apex | `p=none; adkim=s; aspf=r` | Mode monitoring. `adkim=s` = DKIM harus *strict aligned* |

## Kode: tidak ada yang perlu diubah

Sudah diperiksa — app ini **domain-agnostic**:

- Tidak ada URL `*.vercel.app` yang di-hardcode di `src/`
- Tidak ada `metadataBase`, `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, atau `NEXTAUTH_URL`
- Tidak ada `sitemap.ts` / `robots.ts`
- Tidak ada `openGraph` / `twitter` metadata
- Auth.js v5 menyimpulkan host dari request (Vercel di-trust otomatis)

Jadi migrasi ini **murni urusan DNS + konfigurasi**, bukan coding.

## ✅ Record yang harus dipasang pusat

### 1. TXT — verifikasi kepemilikan

```
Name  : _vercel
Type  : TXT
TTL   : 300
Value : vc-domain-verify=nanjing.ppitiongkok.com,912722310071ce643633
```

> [!note] Kali ini TXT juga "melepas" domain dari akun Vercel lama
> Panel Vercel project baru menampilkan pesan: *"This domain is linked to another
> Vercel account. To use it with this project, add a TXT record at
> `_vercel.ppitiongkok.com` to verify ownership."* — jadi TXT ini bukan cuma bukti
> kepemilikan DNS seperti sebelumnya, tapi juga yang membuat Vercel memindahkan klaim
> domain dari project/akun lama ke project baru. Boleh dihapus setelah verifikasi
> selesai, seperti sebelumnya.

### 2. CNAME — arahkan subdomain ke Vercel

```
Name  : nanjing
Type  : CNAME
TTL   : 300
Value : 8881c7f10480b21d.vercel-dns-017.com.
```

Catatan: target ini unik per-project, dan sudah beda dari nilai sebelumnya
(`0456c67eb5e52557.vercel-dns-017.com` — punya project lama, sudah basi). Untuk
perbandingan: pusat memakai `ddd503aacc2b749d.vercel-dns-017.com`, Chongqing
`0e1cc79aaba24d35.vercel-dns-017.com`. Jadi wajar kalau nilainya beda-beda;
jangan pernah menyalin nilai project lain.

## Cara mengecek propagasi

Jalankan ini (Windows PowerShell). Kalau masih "belum ada", berarti pusat belum pasang
atau DNS belum menyebar (5–30 menit):

```powershell
Resolve-DnsName -Name _vercel.ppitiongkok.com -Type TXT -Server 8.8.8.8
Resolve-DnsName -Name nanjing.ppitiongkok.com -Server 8.8.8.8
```

Setelah keduanya muncul → klik **Verify** di Vercel.

## Pesan siap kirim ke pusat

> Halo Tim IT PPI Tiongkok,
>
> Terima kasih sudah menyetujui subdomain untuk PPIT Nanjing. Kami sudah mendaftarkan
> `nanjing.ppitiongkok.com` di Vercel, dan berikut dua record yang perlu dipasang di
> Google Cloud DNS:
>
> **1. TXT** — verifikasi kepemilikan
> Name: `_vercel` · TTL: 300
> Value: `vc-domain-verify=nanjing.ppitiongkok.com,912722310071ce643633`
>
> **2. CNAME** — mengarahkan subdomain
> Name: `nanjing` · TTL: 300
> Value: `8881c7f10480b21d.vercel-dns-017.com.`
>
> Keduanya hanya menyentuh subdomain `nanjing` dan record `_vercel`. Konfigurasi domain
> utama tidak terpengaruh sama sekali — SPF Firebase, DMARC, dan verifikasi Google Search
> Console tetap seperti semula.
>
> Prosesnya sama persis dengan yang sudah berjalan untuk `chongqing.ppitiongkok.com`.
>
> Terima kasih banyak.

> [!tip] Kalau pusat sempat memasang nilai LAMA sebelumnya
> Cek dulu (lihat perintah di atas) sebelum kirim pesan ini lagi. DNS publik pada
> 2026-08-23 masih kosong, jadi kemungkinan besar belum sempat dipasang sama sekali -
> tapi kalau ternyata sudah, minta pusat mengganti nilai CNAME lama dengan yang baru
> di atas, bukan menambah record kedua.

## Setelah subdomain aktif

1. **Google OAuth** — Cloud Console → Credentials → OAuth client (`AUTH_GOOGLE_ID`) →
   tambahkan redirect URI:
   `https://nanjing.ppitiongkok.com/api/auth/callback/google`
   Biarkan URI `*.vercel.app` lama tetap ada sampai migrasi tuntas.
2. **Email** — daftarkan `nanjing.ppitiongkok.com` di Resend → Domains, lalu minta pusat
   memasang 3 record lagi: MX + TXT SPF pada `send.nanjing`, dan TXT DKIM pada
   `resend._domainkey.nanjing`. Semuanya di bawah subdomain kita, tidak menyentuh pusat.

   **Penting dan jadi argumen kuat saat minta izin ke pusat:** semua record ini berada
   **di bawah subdomain kita**, bukan di apex. SPF Firebase, DMARC, dan Google Search
   Console milik pusat **tidak tersentuh sama sekali**.

   Catatan soal DMARC: kebijakan pusat `adkim=s` (strict) diwarisi subdomain karena
   tidak ada `sp=`. DKIM dari Resend ditandatangani pada `nanjing.ppitiongkok.com`
   sehingga *aligned*. Lagi pula `p=none`, jadi tidak ada yang ditolak — tapi tetap
   harus benar supaya laporan DMARC pusat tidak penuh kegagalan atas nama kita.
3. **Set `EMAIL_FROM`** = `PPIT Nanjing <no-reply@nanjing.ppitiongkok.com>`
4. **Hapus `GMAIL_USER` + `GMAIL_APP_PASSWORD`** — di `src/lib/email.ts` Gmail sengaja
   diprioritaskan di atas Resend, jadi selama masih terisi, `EMAIL_FROM` diabaikan.

   Cara memastikan berhasil: buka halaman detail salah satu pendaftar. Kalau sudah
   benar, di bawah dropdown Status tertulis alamat pengirim
   `no-reply@nanjing.ppitiongkok.com` — bukan kotak peringatan merah.
5. **Jadikan domain baru Primary** di project Vercel yang baru, supaya alias
   `*.vercel.app` lama otomatis redirect dan tautan lama tidak mati.

## Hal yang belum terjawab

1. **Siapa yang pegang Google Cloud DNS di pusat?** Menentukan berapa lama prosesnya.
2. **Opsional, belum dikerjakan:** setelah domain final, ada baiknya menambahkan
   `metadataBase` + `openGraph` di `src/app/layout.tsx` supaya preview tautan di
   WhatsApp/Instagram menampilkan kartu yang benar. Sekarang belum ada sama sekali,
   jadi ini peningkatan baru — bukan sesuatu yang rusak karena migrasi.
