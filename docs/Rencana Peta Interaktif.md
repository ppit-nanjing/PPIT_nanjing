# Rencana: Peta Interaktif Bertingkat

> Usulan dari Kenneth (12 November 2026)

**Status (13 November 2026):** tahap 1 sudah dibangun di branch `feat/peta-nanjing-interaktif` dan disetujui Divisi Teknologi. Belum di-merge: akan digabung bersama perubahan lain di tab Jelajahi.

## Ringkasan

Situs punya dua peta yang tadinya berdiri sendiri: **Wilayah Naungan** (`/coverage`, 9 kota) dan **Peta Distrik Nanjing** (`/map`, 11 distrik). Keduanya hanya bisa dilihat: mengarahkan kursor memunculkan nama dan satu angka, lalu berhenti di situ.

Tahap 1 menyambung keduanya:

```
Wilayah Naungan  ->  Peta Distrik Nanjing  ->  distrik terpilih
/coverage            /map                      /map?distrik=gulou
9 kota               11 distrik                kampus + tempat di distrik itu
```

Pengunjung mengklik Nanjing di peta wilayah, masuk ke peta distrik, lalu mengklik satu distrik untuk melihat kampus dan tempat di sana. Mahasiswa baru yang bertanya "kampusku di mana, dan di sekitarnya ada apa?" mendapat jawabannya di satu halaman.

Ini fitur **halaman publik**, bukan konsol. Konsol (`/console/katalog`) tetap menjadi tempat mengisi datanya; lihat [Kota & Katalog](./Kota%20&%20Katalog.md).

## Yang berubah dari usulan awal

Usulan awal memberi tiap distrik halamannya sendiri (`/map/nanjing/gulou`). Setelah datanya dicek, bentuk itu terlalu besar untuk isi yang ada.

| Usulan awal | Yang dibangun | Alasan |
| --- | --- | --- |
| Sebelas halaman distrik | Satu halaman `/map`; memilih distrik menyaring isinya | Hanya ada 19 tempat bertanda distrik. Sebelas halaman berarti tiga kosong dan sisanya berisi 1 sampai 3 tempat |
| `/coverage` dialihkan ke `/map`, peta Nanjing pindah ke `/map/nanjing` | Alamat tidak diubah | Pengunjung tidak merasakan bedanya, sedangkan tautan di navigasi, sitemap, dan konsol harus ikut diubah |
| Teks pengantar distrik sebagai isi utama | Teks pengantar tampil bila ada, tidak wajib | Tabel `districts` masih kosong |
| Kotak cari di kedua peta | Kotak cari hanya di `/map` | Di `/map` nama di peta hanya aksara Mandarin, jadi pencarian pinyin diperlukan. Di `/coverage` daftar 9 kota selalu tampil di samping peta |

## Keadaan data (dicek 13 November 2026)

| Bahan | Keadaan |
| --- | --- |
| Batas 9 kota naungan | Ada (`src/data/nanjing-coverage.geo.json`) |
| Batas 11 distrik Nanjing | Ada (`src/data/nanjing-districts.geo.json`) |
| Jumlah mahasiswa per kota | Kolomnya ada (`coverage_cities.member_count`), belum diisi untuk kota mana pun |
| Tempat terbit | 20, dan 19 punya distrik. Sebelas di antaranya punya foto |
| Sebaran tempat | Xuanwu 8, Qinhuai 3, Gulou 2, Jianye 2, Jiangning 2, Yuhuatai 1, Qixia 1 |
| Kampus Nanjing terbit | 33. Distrik 28 kampus diisi pada 13 November 2026; sebelumnya kosong semua |
| Teks pengantar distrik | Tabel `districts` ada, isinya 0 baris |
| Distrik tanpa kampus maupun tempat | Luhe, Lishui, Gaochun |
| Batas distrik kota selain Nanjing | Belum ada |
| Tempat di kota selain Nanjing | Belum ada (tabel `places` tidak punya kolom kota) |
| Titik koordinat tempat dan kampus | Belum ada |

Lima kampus sengaja dibiarkan tanpa distrik karena datanya meragukan: Jiangsu Health Vocational College (hanzinya milik kampus di Yancheng), Nanjing Maritime Institute (kemungkinan entri ganda Jiangsu Maritime Institute), Nanjing Police Institute (nama Inggris dan hanzi tidak cocok), Jiangsu Union Technical Institute (gabungan banyak sekolah), dan Nanjing Polytechnic Institute.

Enam kampus punya dua lokasi dan dicatat di distrik yang paling dekat pusat kota: Nanjing University, Nanjing Normal University, Hohai University, dan Jiangsu Second Normal University di Gulou; Southeast University di Xuanwu; NUAA di Qinhuai. Kolom `universities.district` hanya memuat satu distrik.

## Yang dibangun di tahap 1

### Peta Distrik Nanjing (`/map`)

- **Peta besar tanpa bingkai.** Peta mengambil lebih dari setengah lebar halaman dan berdiri langsung di atas latar, dikelilingi garis emas tipis yang mengikuti bentuk kotanya. Pada ukuran ini kelima distrik pusat kota (Gulou, Xuanwu, Qinhuai, Jianye, Yuhuatai) terbaca tanpa peta pembesar. Petanya lebih tinggi dari layar, jadi yang menempel saat digulir adalah kolom isi di kanan.
- **Warna berskala.** Makin banyak kampus dan tempat di sebuah distrik, makin pekat warnanya, dalam empat tingkat dengan keterangan di atas peta. Distrik terpilih berwarna emas.
- **Nama di peta.** Tiap distrik diberi nama Mandarin saja. Nama Latinnya hanya muat di sebagian bentuk, jadi demi seragam tidak ditulis di peta; nama Latin ada di daftar, di tooltip, dan di judul saat dipilih.
- **Kotak cari di atas peta**, untuk yang hanya tahu pinyinnya: mengetik "gulou" (atau 鼓楼) meredupkan distrik lain di peta dan menyaring daftar; Enter memilih hasil pertama.
- **Klik untuk memilih.** Klik distrik (di peta atau di daftar) mengganti kolom kanan menjadi isi distrik itu tanpa memuat ulang halaman. Klik distrik yang sama sekali lagi melepas pilihan. Di HP, halaman bergulir ke isi distrik setelah diketuk.
- **Alamat yang bisa dibagikan.** Pilihan tersimpan di alamat (`/map?distrik=gulou`), dan halaman dengan alamat itu sudah dirender lengkap dari server, jadi tetap terbaca tanpa JavaScript.
- **Peta menjawab kursor.** Distrik yang disorot terangkat, bergaris tepi emas, dan namanya ikut membesar. Menyorot baris di daftar melakukan hal yang sama pada bentuknya di peta.
- **Daftar sebagai jalan kedua.** Tanpa pilihan, kolom kanan berisi 11 distrik urut dari yang paling banyak isinya.
- **Isi distrik**, semuanya di kolom kanan: nama Mandarin besar, nama Latin, jumlah isi, teks pengantar bila ada, daftar kampus (nama, hanzi, singkatan, tautan situs), lalu daftar tempat yang ringkas (foto kecil, nama, dan nama Mandarinnya). Rincian tempat tetap di `/places`.
- **Distrik kosong** tetap bisa dipilih dan mengajak pengunjung mengusulkan isi lewat tombol Bantuan & Masukan.

### Wilayah Naungan (`/coverage`)

- Peta tanpa bingkai dengan garis emas yang sama, sedikit lebih dari setengah lebar halaman. Petanya polos tanpa nama kota; nama dan angkanya muncul di tooltip saat kota disorot.
- Menyorot baris di daftar kota mengangkat kotanya di peta dan menampilkan namanya di sana.
- Nanjing berwarna emas dan bisa diklik untuk membuka `/map`; baris Nanjing di daftar punya tautan yang sama.
- Daftar kota pindah ke samping peta dan memakai bentuk baris yang sama dengan daftar distrik.
- Warna berskala mengikuti jumlah mahasiswa per kota. Selama angkanya belum diisi, semua kota selain Nanjing berwarna sama.

## Catatan untuk Divisi Teknologi

| Berkas | Isi |
| --- | --- |
| `src/components/coverage-map.tsx` | Komponen peta bersama (klien). Menggambar SVG dari berkas batas wilayah |
| `src/components/map/district-explorer.tsx` | Peta Nanjing dan kolom isi distrik (klien) |
| `src/app/map/page.tsx` | Mengambil tempat, kampus, dan teks distrik, lalu mengirimnya sebagai data biasa |
| `src/components/map/coverage-explorer.tsx` | Peta wilayah dan daftar kota (klien, supaya baris dan peta berbagi sorotan) |
| `src/app/coverage/page.tsx` | Mengambil data kota naungan dan mengirimnya sebagai data biasa |

- **Memilih distrik tidak memanggil server.** Semua baris (puluhan) dikirim sekali; `DistrictExplorer` membaca `?distrik=` lewat `useSearchParams` dan mengganti alamat dengan `history.replaceState`. `replaceState` dipilih supaya mencoba enam distrik tidak berarti enam kali menekan Kembali.
- **Pencocokan distrik** tetap lewat `canonicalDistrict()` di server. Tempat atau kampus yang distriknya bukan salah satu dari 11 nama baku tidak tampil di `/map`.
- **Prop baru `CoverageMap`**: `links` (id wilayah ke alamat; wilayah bertautan menjadi `<a>` sungguhan), `onSelect` (menangani klik biasa di tempat), `highlight` dan `highlightLabel` (wilayah emas), `spotlight` (mengangkat wilayah dari luar peta), `labels` (`false` membuat peta polos tanpa nama), `only` (meredupkan wilayah lain, dipakai pencarian). Prop `hint` dan `searchLabel` dihapus.
- **Tiap bentuk didefinisikan sekali** di `<defs>` dan digambar beberapa kali lewat `<use>` (garis emas, isi, dan salinan yang terangkat saat disorot), supaya data garisnya tidak berulang di HTML.
- **Garis emas di sekeliling peta** bukan garis tepi biasa: goresan emas lebar ditimpa goresan sewarna latar yang sedikit lebih sempit, sehingga tersisa garis 1 piksel pada jarak tetap dari bentuk.
- **Tingkat warna** dihitung dari nilai terbesar: sepertiga terbawah, tengah, dan teratas, ditambah "belum ada". Sengaja empat tingkat dan bukan gradasi, supaya nama di atasnya tetap terbaca.
- **Warna memakai token `heading`, bukan `primary-container`.** Di mode gelap `primary-container` sama emasnya dengan `accent`, sehingga distrik terpadat dan distrik terpilih tidak bisa dibedakan.
- **Letak nama** dicari dengan `labelPoint()`: titik di dalam bentuk yang paling jauh dari garis tepi. Titik pusat pemerintahan di berkas batas wilayah tidak dipakai karena untuk Qixia dan Jiangning letaknya di sudut bentuk.
- **Keyboard**: tiap wilayah bisa difokus dengan Tab; wilayah yang terfokus terangkat dan bergaris tepi tebal.

## Yang perlu disiapkan pengurus

- **Memastikan 5 kampus yang meragukan** di atas, lalu mengisi distriknya di konsol.
- **Meninjau 6 kampus dua lokasi**: pindahkan ke distrik lain bila kebanyakan mahasiswa Indonesia ada di kampus yang satunya.
- **Menambah tempat dan foto.** Sembilan dari 20 tempat belum berfoto, dan empat distrik belum punya tempat sama sekali.
- **Teks pengantar 11 distrik** (tab Distrik di konsol). Dua kalimat dari orang yang tinggal di sana sudah cukup; sebaiknya tidak ditulis AI.
- **Jumlah mahasiswa dan kontak** tiap kota naungan.

## Tahap berikutnya

| Tahap | Isi | Perubahan database | Ukuran |
| --- | --- | --- | --- |
| 1. Sambungan | Sudah dibangun, lihat di atas | Tidak ada | Selesai |
| 2. Kenyamanan | Panel kota dengan daftar kampus per kota, pencarian lintas kota/distrik/kampus/tempat, tautan "Lihat di peta" dari kartu `/places` | Tidak ada | Sedang |
| 3. Titik di peta | Koordinat tempat dan kampus, titik di peta distrik | Migrasi 2 tabel | Besar, dan butuh pengisian data |

Yang ditunda dari usulan awal, beserta alasannya:

- **"Kampusku"** (menyorot distrik kampus pengguna). Nama kampus di sensus berupa teks bebas, jadi pencocokannya tebak-tebakan.
- **Animasi memperbesar saat pindah peta.** Kedua peta ada di halaman berbeda, jadi animasinya harus selesai sebelum halaman berganti.
- **Halaman tersendiri per distrik.** Layak dibuat kalau tiap distrik sudah punya cukup isi dan teks pengantar; alamat `/map?distrik=...` bisa dialihkan ke sana.
- **Pemilih lokasi dengan mengklik peta** di tahap 3. Peta distrik tidak punya jalan atau patokan, jadi kliknya tidak akan akurat. Lebih baik pengurus menempel koordinat dari Amap.

## Yang perlu diputuskan

1. Setuju dengan bentuk satu halaman ini, atau tetap ingin halaman tersendiri per distrik?
2. Setuju kotak cari hanya ada di `/map`, tidak di `/coverage`?
3. Siapa yang mengisi teks pengantar distrik dan menambah tempat, dan sampai kapan?
4. Tahap 2 dan 3 masuk rencana?

## Di luar cakupan

- Peta jalan atau ubin (Google Maps, Amap, OpenStreetMap), petunjuk arah, dan lokasi pengguna secara langsung.
- Peta distrik untuk kota selain Nanjing, sampai ada datanya.
- Mengubah cara pengurus mengisi data.
