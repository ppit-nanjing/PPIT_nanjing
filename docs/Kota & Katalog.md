# Kota & Katalog (konsol)

> `/console/katalog`. Tempat pengurus mengisi halaman publik Tempat, Kampus, Wilayah Naungan, Katalog, Sponsor, dan Donasi. Dirombak 2026-11 dari masukan Vincent ("Needs better UI").

## Yang berubah (2026-11)

Dulu halaman ini satu gulungan panjang berisi 8 bagian lipat, dengan form tambah selalu terbuka di atas daftar dan form edit yang hanya memakai placeholder. Sekarang:

- **Tujuh tab** lewat `?tab=`: Tempat, Kampus, Distrik, Wilayah Naungan, lalu Merchandise, Sponsor, Donasi. Tiap tab menampilkan jumlah isinya; Donasi menampilkan jumlah laporan yang menunggu.
- **Satu pola untuk semua daftar**: tombol "Tambah ..." membuka form di tempat, baris menampilkan gambar kecil, nama, dan keterangan, dan **klik baris membuka form editnya**. Tombol Hapus ada di dalam form edit (dengan konfirmasi), bukan di tiap baris.
- **Cari dan saring** muncul sendiri begitu daftar berisi 7 entri atau lebih. Tempat disaring per kategori, Kampus per kota.
- **Form tambah dan edit memakai komponen yang sama**, jadi keduanya tidak bisa berbeda isian. Semua isian punya label; kolom terjemahan Inggris dilipat ("kosongkan untuk diterjemahkan otomatis").
- **Distrik dipilih dari daftar**, bukan diketik (lihat di bawah).
- **Laporan donasi** diputuskan dengan tombol Verifikasi / Tolak; yang menunggu selalu di atas.

Tidak ada perubahan skema, dan Server Action-nya tidak berubah: nama isian form sama dengan sebelumnya.

## Berkas

| Berkas | Isi |
| --- | --- |
| `src/app/console/katalog/page.tsx` | Gerbang akses, satu putaran pengambilan data, memilih tab |
| `src/components/console/katalog/shared.tsx` | Daftar tab (`KATALOG_TABS`), `TabIntro`, `AddPanel`, `EntryRow`, `FormFooter`, `EnglishFields` |
| `src/components/console/katalog/katalog-nav.tsx` | Baris tab (klien, supaya tab aktif tergulir ke layar di HP) |
| `src/components/console/katalog/filter-list.tsx` | Daftar dengan cari + saring (klien). Baris yang tidak cocok disembunyikan, tidak dibuang, supaya form edit yang terbuka tidak kehilangan isiannya |
| `src/components/console/katalog/kota-tabs.tsx` | Tab Tempat, Kampus, Distrik, Wilayah Naungan |
| `src/components/console/katalog/katalog-tabs.tsx` | Tab Merchandise, Sponsor, Donasi |
| `src/lib/nanjing-districts.ts` | 11 distrik Nanjing dari berkas batas wilayah `/map`, dan `canonicalDistrict()` |

## Tab dan halaman publiknya

| Tab | Mengisi | Catatan |
| --- | --- | --- |
| Tempat | `/places`, hitungan di `/map` | "Tampil di situs publik" hanya ada di form edit; tempat baru langsung tampil |
| Kampus | `/universities` | Kota memakai saran dari daftar wilayah naungan, tapi tetap boleh diketik |
| Distrik | belum ada | Tabel `districts` (teks pengantar) **belum dibaca halaman publik mana pun**. Baris menampilkan jumlah tempat dan kampus terbit di distrik itu, sama dengan angka di `/map` |
| Wilayah Naungan | `/coverage` | Daftar kota tetap; yang diisi jumlah mahasiswa, kontak, catatan |
| Merchandise | `/catalogue` | Etalase, bukan toko |
| Sponsor | `/catalogue/sponsorship` | |
| Donasi | `/catalogue/donasi` | Hanya untuk pemegang modul `organization` |

## Aturan yang perlu diketahui

- **Akses**: halaman dan semua action memakai modul `content`. Tab Donasi, datanya, dan action-nya memakai `organization`; `?tab=donasi` dari akun tanpa modul itu jatuh ke tab Tempat.
- **Distrik**: `places.district` dan `universities.district` tetap teks bebas di database, dan `/map` mencocokkannya lewat nama Inggris atau Mandarin. Form sekarang menawarkan 11 nama baku dari `src/data/nanjing-districts.geo.json`, jadi salah ketik tidak lagi membuat tempat hilang dari peta. Nilai lama yang bukan nama baku tetap ditawarkan apa adanya, supaya membuka lalu menyimpan form tidak mengubahnya diam-diam.
- **Distrik disimpan lewat nama**: `upsertDistrict` mencocokkan nama, jadi saat mengedit namanya dikunci. Mengganti nama berarti hapus lalu tambah.
- **Terjemahan Inggris**: isian `*_en` yang kosong diterjemahkan Groq saat disimpan; yang sudah diisi tidak pernah ditimpa (`withEnglish` di `src/app/actions/city-content.ts`).
- **Donasi**: situs tidak memproses pembayaran. `updateDonationStatus` mengosongkan `note` setiap kali status diubah (perilaku lama, tidak diubah di sini).

## Menambah tab baru

1. Tambahkan ke `KATALOG_TABS` di `shared.tsx` (kunci, label, kelompok).
2. Buat komponen tabnya dengan pola `TabIntro` + `AddPanel` + `FilterList` berisi `EntryRow`, dan satu komponen form untuk tambah dan edit.
3. Kirim jumlahnya ke `counts` dan render tabnya di `page.tsx`. Tab yang tidak dikirim di `counts` tidak tampil, jadi itulah tempat gerbang aksesnya.

Rencana lanjutan untuk sisi publik ada di [Rencana Peta Interaktif](./Rencana%20Peta%20Interaktif.md).
