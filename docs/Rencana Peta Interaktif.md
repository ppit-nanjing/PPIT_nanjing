# Rencana: Peta Interaktif Bertingkat

> Usulan dari Kenneth (12 November 2026)

## Ringkasan

Hari ini situs punya dua peta yang berdiri sendiri: peta **Wilayah Naungan** (`/coverage`, 9 kota) dan **Peta Nanjing** (`/map`, 11 distrik). Keduanya hanya bisa dilihat: mengarahkan kursor memunculkan nama dan satu angka, lalu berhenti di situ.

Usulannya menyambung keduanya menjadi satu perjalanan tiga tingkat yang bisa diklik:

```
Wilayah Naungan  ->  Kota Nanjing  ->  Distrik (mis. Gulou)
9 kota               11 distrik         tempat + kampus di distrik itu
```

Pengunjung mulai dari peta provinsi, mengklik Nanjing, masuk ke peta distrik, mengklik satu distrik, lalu melihat tempat dan kampus yang ada di sana. Mahasiswa baru yang bertanya "kampusku di mana, dan di sekitarnya ada apa?" mendapat jawabannya dalam tiga klik.

Ini fitur **halaman publik**, bukan konsol. Konsol (`/console/katalog`) tetap menjadi tempat mengisi datanya dan sudah dirapikan terpisah; lihat [Kota & Katalog](./Kota%20&%20Katalog.md).

## Kenapa layak dikerjakan

- **Sebagian besar bahannya sudah ada.** Dua peta itu memakai komponen yang sama (`src/components/coverage-map.tsx`) dan berkas batas wilayah yang sudah ada di repo (`src/data/nanjing-coverage.geo.json`, `src/data/nanjing-districts.geo.json`). Tempat dan kampus sudah mencatat distriknya. Yang belum ada hanya sambungannya.
- **Ada data yang sudah diisi tapi belum pernah tampil.** Tabel `districts` menyimpan teks pengantar tiap distrik, dan pengurus sudah bisa mengisinya di konsol, tapi belum ada halaman publik yang membacanya. Halaman distrik adalah rumah yang pas untuk teks itu.
- **Tidak bergantung pada layanan peta luar.** Petanya digambar sebagai SVG dari berkas di repo, tanpa Google Maps atau penyedia ubin lain, jadi aman dibuka dari Tiongkok daratan dan tanpa biaya atau lisensi.

## Yang sudah ada dan yang belum

| Bahan | Status |
| --- | --- |
| Batas 9 kota naungan | Ada (`nanjing-coverage.geo.json`) |
| Batas 11 distrik Nanjing | Ada (`nanjing-districts.geo.json`) |
| Jumlah mahasiswa, kontak, catatan per kota | Ada (`coverage_cities`), diisi di konsol |
| Kampus per kota | Ada (`universities.city`) |
| Kampus dan tempat per distrik | Ada (`universities.district`, `places.district`); sejak 2026-11 dipilih dari daftar baku di konsol |
| Teks pengantar distrik | Ada (`districts`), belum tampil di mana pun |
| Batas distrik kota selain Nanjing | Belum ada |
| Tempat di kota selain Nanjing | Belum ada (tabel `places` tidak punya kolom kota) |
| Titik koordinat tempat dan kampus | Belum ada (hanya tautan peta dan stasiun metro) |
| Klik wilayah untuk masuk ke tingkat berikutnya | Belum ada |

## Rancangan

### Tiga tingkat, satu alamat untuk tiap tingkat

| Tingkat | Alamat usulan | Isi |
| --- | --- | --- |
| 1. Wilayah | `/map` | Peta 9 kota naungan. Warna tiap kota mengikuti jumlah mahasiswanya |
| 2. Kota | `/map/nanjing` | Peta 11 distrik. Warna mengikuti jumlah tempat dan kampus |
| 3. Distrik | `/map/nanjing/gulou` | Teks pengantar distrik, daftar kampus, daftar tempat per kategori |

Tiap tingkat punya alamatnya sendiri supaya bisa dibagikan ("ini daerah kampusku"), tombol kembali di browser bekerja wajar, dan mesin pencari bisa mengindeks halaman distrik. `/coverage` dialihkan ke `/map` supaya tautan lama tidak mati.

### Kota mana yang bisa "dimasuki"

Ide awalnya: setiap kota bisa diklik dan membuka petanya sendiri. Usulan saya sedikit berbeda:

- **Semua kota bisa diklik**, dan kliknya selalu ada isinya: panel kota berisi jumlah mahasiswa, kontak perwakilan, dan **daftar kampus di kota itu** (datanya sudah ada di `universities.city`).
- **Hanya Nanjing yang punya tingkat distrik**, karena hanya Nanjing yang punya batas distrik dan data tempat. Panel Nanjing menampilkan tombol "Jelajahi distrik Nanjing".

Dengan begitu tidak ada klik yang berujung halaman kosong, dan kota lain bisa menyusul satu per satu kalau nanti datanya ada, tanpa mengubah rancangan.

### Halaman distrik

Urutan dari atas:

1. Jejak lokasi: **Wilayah Naungan / Nanjing / Gulou 鼓楼区**, tiap bagiannya bisa diklik untuk naik satu tingkat.
2. Peta kecil Nanjing dengan distrik ini disorot, supaya orang tetap tahu posisinya, dan bisa langsung pindah ke distrik tetangga.
3. Teks pengantar distrik (dari tabel `districts`).
4. **Kampus di distrik ini**: logo, nama, singkatan, koordinator.
5. **Tempat di distrik ini**, dikelompokkan per kategori (Wisata, Kuliner, Ibadah, Kebutuhan Sehari-hari, dan seterusnya) dengan penyaring kategori. Tiap tempat menampilkan stasiun metro terdekat dan tautan peta, memakai kartu yang sama dengan `/places`.

Distrik tanpa isi tetap punya halaman, dengan kalimat jujur: "Belum ada tempat atau kampus tercatat di distrik ini" dan ajakan mengusulkan lewat Masukan.

### Perbaikan di luar ide awal

1. **Cari dari tingkat mana pun.** Satu kotak cari untuk kota, distrik, kampus, dan tempat. Mengetik "NJU" langsung membawa ke Gulou dengan kampusnya disorot. Kotak cari kota di peta sekarang menjadi dasarnya.
2. **Daftar sebagai jalan kedua.** Di samping peta selalu ada daftar yang isinya sama. Peta sulit dipakai dengan keyboard, pembaca layar, atau jari di layar kecil; daftar membuat semua orang tetap bisa sampai ke tujuan.
3. **Pola sentuh di HP.** Di HP tidak ada "arahkan kursor". Ketukan pertama memilih wilayah dan membuka lembar info di bawah layar; tombol di lembar itu yang membawa masuk. Jadi tidak ada salah masuk karena salah ketuk.
4. **Warna yang bercerita.** Makin banyak isinya, makin pekat warnanya, dengan keterangan skala. Peta sekarang mewarnai semua wilayah sama; angkanya baru terlihat saat wilayah diarahkan atau diketuk.
5. **Perpindahan yang terasa menyelam.** Saat kota diklik, peta memperbesar ke kota itu sebelum berganti ke peta distrik. Untuk pengguna yang mematikan animasi, pergantiannya langsung.
6. **"Kampusku".** Pengguna yang sudah login dan mengisi sensus langsung melihat kota dan distrik kampusnya disorot, dengan jalan pintas "Lihat sekitar kampusku". Kampusnya dicocokkan dari nama kampus di sensus orang itu sendiri, dan tidak ditampilkan ke orang lain.
7. **Halaman Tempat dan Kampus tetap ada.** `/places` dan `/universities` tetap menjadi tampilan daftar lengkap. Peta adalah pintu masuk tambahan, dan tiap kartu tempat mendapat tautan "Lihat di peta" ke distriknya.
8. **Dua bahasa.** Mengikuti kamus `id` dan `en` yang sudah ada; nama distrik tidak diterjemahkan.

### Tahap lanjutan: titik di peta

Menampilkan titik tiap tempat di dalam peta distrik membutuhkan koordinat, yang belum ada. Kalau nanti diinginkan:

- Dua kolom baru (lintang, bujur) di `places` dan `universities`, lewat migrasi.
- Pengurus **tidak perlu mengetik koordinat**: di form konsol, peta distrik ditampilkan dan pengurus mengklik lokasi tempatnya. Titik digambar di SVG yang sama, tetap tanpa layanan peta luar.
- Tempat tanpa koordinat tetap muncul di daftar, hanya tidak punya titik.

Ini sengaja dijadikan tahap terakhir: tahap 1 dan 2 sudah berguna tanpa koordinat, dan mengisi titik untuk semua tempat adalah pekerjaan pengurus yang tidak kecil.

## Tahapan

| Tahap | Isi | Perubahan database | Ukuran |
| --- | --- | --- | --- |
| 1. Sambungan | Klik kota, klik distrik, halaman distrik (teks pengantar + kampus + tempat), jejak lokasi, alamat per tingkat, `/coverage` dialihkan | Tidak ada | Sedang |
| 2. Kenyamanan | Panel kota dengan daftar kampus, cari lintas tingkat, lembar info di HP, warna berskala, animasi perpindahan, "Kampusku" | Tidak ada | Sedang |
| 3. Titik di peta | Koordinat tempat dan kampus, pemilih lokasi di konsol, titik di peta distrik | Migrasi 2 tabel | Besar, dan butuh pengisian data |

Tahap 1 bisa dirilis sendiri dan sudah memenuhi ide awalnya.

## Yang perlu disiapkan pengurus

- **Teks pengantar 11 distrik** (tab Distrik di konsol). Tab itu sudah menunjukkan distrik mana yang belum punya teks.
- **Distrik tiap tempat dan kampus di Nanjing** diisi, supaya tidak ada yang tertinggal dari peta.
- **Kota tiap kampus** ditulis seragam dengan nama kota naungan (konsol sudah memberi saran saat mengetik).
- **Jumlah mahasiswa dan kontak** tiap kota naungan.

## Yang perlu diputuskan

1. Setuju bahwa hanya Nanjing yang punya tingkat distrik untuk saat ini?
2. Alamatnya: digabung di bawah `/map` seperti usulan, atau `/coverage` dan `/map` tetap terpisah?
3. Siapa yang mengisi teks pengantar distrik, dan sampai kapan?
4. Tahap 3 (titik di peta) masuk rencana, atau cukup sampai tahap 2?

## Di luar cakupan

- Peta jalan atau ubin (Google Maps, Amap, OpenStreetMap), petunjuk arah, dan lokasi pengguna secara langsung.
- Peta distrik untuk kota selain Nanjing, sampai ada datanya.
- Mengubah cara pengurus mengisi data, selain pemilih lokasi di tahap 3.
