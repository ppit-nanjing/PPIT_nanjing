# Perbandingan fitur: PPIT Nanjing vs PPIT Chongqing

Diaudit 2026-08-18 dengan menelusuri `chongqing.ppitiongkok.com` langsung
(navigasi SPA + kontrol 404 untuk memastikan halaman benar-benar ada, bukan
soft-404 — situs mereka mengembalikan HTTP 200 untuk semua path).

## Struktur navigasi Chongqing (lengkap)

| Menu | Isi |
|---|---|
| **About** | About PPIT `/about`, Cabinets `/about/cabinet` |
| **Community** | Events `/events`, News / Articles `/news`, Gallery `/gallery`, Join PPIT `/oprec` |
| **Discover** | Universities `/universities`, Chongqing Student Guide `/chongqing-guide`, Map `/map`, Places `/places` |
| *top level* | Jobs `/opportunities`, Catalogue `/merchandise`, Log in |

`/merchandise` bukan satu halaman — itu shell "Catalogue" dengan tiga tab:
**Merchandise**, **Swarga Care**, **Sponsorship**.

## Yang mereka punya, kita belum

### 1. Universities — `/universities`
Direktori universitas. Isinya: *"24 partner universities across 9 districts,
spanning Chongqing and Guizhou"*, dikelompokkan per distrik, dan **tiap distrik
diberi paragraf konteks** (mis. Fuling dijelaskan soal pertemuan Sungai Wu dan
Yangtze serta zhacai). Ada filter All / Chongqing / Guizhou.

Untuk Nanjing ini sangat relevan — Nanjing punya banyak universitas besar
(Nanjing University, Southeast University, NUAA, NUST, Hohai, NJUPT, dll).

### 2. Student Guide — `/chongqing-guide`
Halaman untuk satu produk: *"Chongqing Companion: All in One"*, buku panduan
untuk mahasiswa Indonesia yang baru datang, dengan tombol Download / Read.
Halamannya sendiri tipis — nilainya ada di dokumennya.

### 3. Map — `/map`
Peta distrik interaktif. Hover menyorot distrik, klik menampilkan informasinya,
bisa pinch-zoom dan drag. Batas wilayahnya *"sourced from official Chinese
administrative data"*. Mencakup Chongqing + Guizhou (dua provinsi dibedakan).

> Catatan: kita **sudah punya** `/organization/map`, tapi itu peta cabang PPI
> se-Tiongkok — beda hal. Yang ini peta distrik dalam satu kota.

### 4. Places — `/places`
*"7 curated places across 1 districts"* — tempat wisata dan tempat ibadah,
masing-masing dengan penjelasan singkat. Ada filter kategori: All / Tourism /
Spiritual.

Untuk Nanjing bahannya melimpah: Zhongshan Ling, tembok Ming, Fuzimiao,
Qinhuai, Purple Mountain — plus masjid dan gereja untuk kategori spiritual.

### 5. Catalogue — `/merchandise`
Tiga tab dalam satu shell:

- **Merchandise** — katalog produk (T-Shirt, Hoodie, dst) dengan "Quick View".
  Semua item saat ini berstatus *Unavailable*, jadi ini etalase, belum toko.
- **Swarga Care** — donasi. *"A little goes a long way — your support helps fund
  events, printed guidebooks, and everyday essentials"*. Ada **Wall of
  Supporters**, dan donasi **wajib login**.
- **Sponsorship** — kemitraan/sponsor.

## Yang kita punya, mereka belum

Ini penting supaya perbandingannya adil — kita tidak tertinggal secara
keseluruhan, fokusnya saja yang berbeda. Kita lebih kuat di sisi
*operasional organisasi*, mereka lebih kuat di sisi *konten kota*.

| Milik kita | Chongqing |
|---|---|
| `/inventory` + pinjam, sumbang, ajukan barang | tidak ada |
| `/sensus` (pendataan mahasiswa) | tidak ada |
| `/organization` + AD/ART + review + cabang + peta cabang | tidak ada |
| `/career` + panduan karier + mentorship | tidak ada |
| `/profile` + riwayat pengajuan | tidak ada |
| `/notifications` (in-app) | tidak ada |
| `/search` (pencarian global) | tidak ada |
| `/gallery/archive` | tidak ada |
| Console admin lengkap per modul | tidak diketahui (tidak bisa diakses) |

Padanan yang namanya beda: `/jobs` = `/opportunities` mereka,
`/join-us` = `/oprec` mereka.

## Perkiraan usaha (kasar)

| Fitur | Usaha | Butuh apa |
|---|---|---|
| Places | **kecil** | 1 tabel + halaman daftar/filter + isi konten |
| Universities | **kecil–sedang** | 1 tabel + pengelompokan distrik + isi konten |
| Student Guide | **kecil** | 1 halaman + berkas PDF (Vercel Blob belum aktif) |
| Merchandise (etalase) | **sedang** | tabel produk + admin + galeri gambar |
| Sponsorship | **kecil–sedang** | tabel sponsor + logo + tingkatan |
| Map distrik | **besar** | butuh GeoJSON batas distrik Nanjing + interaksi SVG |
| Swarga Care (donasi) | **besar / berisiko** | pembayaran nyata; regulasi + rekening organisasi |

## Catatan sebelum memutuskan

- **Donasi bukan sekadar fitur.** Menerima uang atas nama organisasi menyangkut
  rekening resmi, pertanggungjawaban, dan kemungkinan aturan pembayaran lintas
  negara. Chongqing pun masih mengunci donasinya di balik login dan belum punya
  satu pendukung. Jangan disamakan bobotnya dengan halaman Places.
- **Merchandise mereka semuanya "Unavailable"** — jadi itu etalase, bukan toko.
  Kalau kita cuma mau menyamai, etalase saja jauh lebih murah daripada
  membangun keranjang belanja.
- **Peta distrik butuh data batas wilayah.** Chongqing menyebut sumbernya data
  administrasi resmi Tiongkok. Untuk Nanjing perlu GeoJSON 11 distriknya, dan
  itu pekerjaan tersendiri sebelum menyentuh kodenya.
- **Unggahan berkas masih terblokir.** `BLOB_READ_WRITE_TOKEN` belum diatur,
  jadi Student Guide (PDF) dan gambar merchandise belum bisa diunggah lewat app.
