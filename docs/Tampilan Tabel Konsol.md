# Tampilan Tabel di Konsol

> Bagian dari [Information Architecture](./Information%20Architecture.md). Ditambahkan **2026-10-25**. Terkait: [Evaluasi Acara](./Evaluasi%20Acara.md), [Event Management](./Event%20Management.md).

Tab **Tabel** menampilkan data yang bisa diekspor ke Excel/CSV sebagai tabel di layar, tanpa perlu mengunduh file. Tabelnya hanya untuk dibaca: tidak ada sel yang bisa disunting. Ada dua tempat di `/console/events/:id`:

| Tempat | Cara membuka | Isinya |
|---|---|---|
| Section **Evaluasi Acara** (peserta dan panitia) | tab **Tabel** di sebelah Grafik, Jawaban, Respons | Kolom dan baris yang sama dengan file ekspor evaluasi, termasuk respons bentuk standar yang tidak tampil di tab lain |
| Section **Daftar Pendaftar** | tombol **Daftar / Tabel** di atas daftar | Satu baris per pendaftar, kolomnya tergantung hak pembaca (lihat di bawah) |

## Yang bisa dilakukan di tabel

- **Urutkan**: klik judul kolom. Urutannya naik, turun, lalu kembali ke urutan awal. Sel kosong selalu di bawah. Angka diurutkan sebagai angka, teks dengan urutan alfabet Indonesia (`Peserta 2` sebelum `Peserta 10`).
- **Cari**: kotak cari membaca semua kolom yang sedang tampil.
- **Filter per kolom**: tombol *Filter* memunculkan kotak di bawah tiap judul. Teks dicocokkan sebagai potongan kata. Kolom angka juga menerima `>=8`, `<=5`, `>3`, `<10`, atau `=7`.
- **Kolom**: tombol *Kolom* memilih kolom yang tampil. *Bawaan* mengembalikan pilihan awal.
- **Teks penuh**: kalau ada kolom berisi teks panjang (komentar, jawaban), baris dipotong dua baris sampai tombol ini dinyalakan.
- **Salin**: menyalin baris yang lolos pencarian dan filter, dengan kolom yang sedang tampil, untuk ditempel di Google Sheets atau Excel. Tombolnya hanya muncul untuk yang boleh mengekspor.
- **Ke Google Sheets**: satu tombol, dua cara kerja tergantung setelan server (lihat bagian "Google Sheets" di bawah). Tanpa token Google: menyalin tabel yang tampil lalu membuka Google Sheets kosong (`https://sheets.new`), tinggal Ctrl+V. Dengan token: server membuat Google Sheet berisi semua baris dan langsung membukanya. Dua-duanya salinan: mengubah sheet tidak mengubah data di website, dan data baru di website tidak muncul di sheet yang sudah ada. Butuh VPN dari Tiongkok.
- **Unduh**: tautan ke file asli (CSV, atau Excel untuk evaluasi). Isinya tidak berubah dari sebelum ada tabel.
- **Halaman**: 100 baris per halaman. Salin tetap mengambil semua baris, bukan hanya halaman yang terbuka.

Sticky: judul kolom menempel di atas, kolom pertama menempel di kiri saat digeser.

## Waktu

Semua kolom waktu ditulis dalam **jam Tiongkok** (CST, UTC+8) dan judul kolomnya menyebut zonanya, sama dengan file ekspor. Browser yang ada di zona waktu lain tetap melihat jam Tiongkok.

## Siapa melihat apa

Tabel tidak menentukan hak akses. Server memotong datanya lebih dulu sesuai hak pembaca, tabel hanya menampilkan apa yang diterimanya.

| Pembaca | Daftar Pendaftar | Salin + unduh |
|---|---|---|
| Panitia acara dengan `event.viewRegistrants` (versi ringkas) | Nama, status, keanggotaan, cabang, kampus, WeChat ID, kategori tarif, waktu check-in, di-check-in oleh | Tidak ada |
| BPH Kabinet, Divisi Teknologi, BPH Panitia acara ini (versi lengkap) | Semua kolom ringkas + email, waktu daftar, biodata, jawaban pertanyaan acara | Ada |

Evaluasi: peserta memakai gerbang konsol acara yang sama dengan halaman dan ekspornya. Tab Panitia memakai gerbang `canReadCommitteeEvaluation` (lebih ketat, karena barisnya membawa nama pengisi).

Kolom yang berisi data pribadi (**Nomor Paspor, No. Telpon China, Bukti Mahasiswa Aktif**) ada di tabel versi lengkap tetapi **tersembunyi sampai dinyalakan lewat tombol Kolom**, dan ditandai gembok. Penyembunyian ini hanya kenyamanan supaya paspor tidak terbaca orang yang berdiri di belakang layar. Kolom tersembunyi tidak ikut pencarian dan tidak ikut disalin. Pengamannya tetap pemotongan di server.

Sel berupa berkas unggahan (`/api/files/...` atau `/api/sensus/student-card/...`) tampil sebagai tautan **Buka berkas**. Saat disalin, tautannya dilengkapi dengan alamat situs, sama seperti di CSV, dan tetap butuh login pengurus untuk dibuka.

Isi sel bisa buatan peserta (jawaban formulir), jadi tidak semua teks yang diawali `/api/` dijadikan tautan. `isUploadedFilePath()` di `src/lib/private-files.ts` mengurai path-nya dulu: hasilnya harus tetap di origin yang sama dan tetap di bawah dua awalan di atas setelah browser menyederhanakan `..`. Jawaban seperti `/api/files/../cron/mark-overdue` atau `//situs-lain/api/files/x` tampil sebagai teks biasa.

## Penutupan kebocoran data pendaftar

Sebelum perubahan ini, halaman Daftar Pendaftar menyembunyikan email dan jawaban formulir di tampilan untuk versi ringkas, tetapi `page.tsx` tetap mengirim keduanya ke browser untuk semua pendaftar. Isinya terbaca di tab Network atau view-source. Sekarang `userEmail` dan `answers` dikirim kosong kalau pembacanya bukan BPH atau admin penuh (`canSeeRegistrantDetail`). Biodata sudah dipotong dengan cara yang sama sejak awal.

Aturannya: **kalau pembaca tidak boleh melihat suatu field, field itu tidak boleh ada di props komponen klien**, walaupun UI-nya tidak menampilkannya.

Yang masih ada untuk versi lengkap: kolom pribadi yang tersembunyi tetap ikut dikirim ke browser pembaca yang berhak. Mereka memang berhak melihatnya, dan datanya sama dengan yang sebelumnya sudah ada di daftar kartu. Kalau ke depan ingin ketat sampai level ini, kolom pribadi bisa diambil dari server baru saat tombol "tampilkan" ditekan.

## Letak kodenya

| File | Peran |
|---|---|
| `src/lib/event-evaluation-dataset.ts` | `buildEvaluationDataset()`: kolom dan baris evaluasi. Dipakai rute ekspor **dan** tab Tabel, jadi keduanya tidak bisa berbeda |
| `src/lib/registration-table.ts` | Tipe `Registration`, label status/biodata, dan `buildRegistrationTable()` untuk pendaftar |
| `src/lib/table-view.ts` | Bentuk `TableColumn` / `TableRow`, `datasetToTable()` (dataset ekspor menjadi tabel, tanggal menjadi jam Tiongkok) |
| `src/lib/datetime.ts` | `timeHeader()`: judul kolom waktu berlabel zona, dipakai ekspor dan tabel |
| `src/components/console/data-table.tsx` | Komponen tabel (urut, cari, filter, kolom, salin, halaman) |

Menambah tabel di modul lain: rakit `TableData` di server atau lewat fungsi murni seperti di atas (kolom bertanda `sensitive` untuk data pribadi), lalu render `<DataTable label=... columns rows />`. Isi `canCopy` dan `exportLinks` hanya kalau pembacanya memang boleh mengekspor.

## Google Sheets

Tombol **Ke Google Sheets** punya dua mode. Pilihan antar mode otomatis: server memakai mode Sheet kalau `GOOGLE_DRIVE_REFRESH_TOKEN` terisi.

| | Salin-tempel (tanpa token) | Sheet dari server (dengan token) |
|---|---|---|
| Isi | Kolom yang tampil, sesuai pencarian dan filter | Semua baris, tanpa kolom paspor, telepon, dan bukti mahasiswa |
| Cara | Disalin ke clipboard, tab Sheets kosong terbuka, Ctrl+V | Server membuat Sheet, tab terbuka langsung di sheet itu |
| Data lewat server atau Google | Tidak | Ya, ke Google (akun organisasi) |
| Siapa bisa membuka | Pembuat Sheet kosongnya (akunnya sendiri) | Hanya email akun pengurus yang menekan tombol, tanpa hak membagikan ulang |
| Umur | Sesuai Drive pemilik | Tidak dihapus otomatis. Disimpan di Drive akun organisasi, satu folder per acara, dihapus manual oleh pemilik akunnya |

Gerbang mode Sheet sama dengan ekspor file: pendaftar hanya untuk BPH Kabinet, Divisi Teknologi, dan BPH Panitia acara ini (`openRegistrationsInSheets`); evaluasi untuk yang boleh mengekspor evaluasi, dan evaluasi panitia hanya BPH (`openEvaluationInSheets`). Server mengambil datanya sendiri dari database lalu membuat Sheet. Isi tabel di browser tidak dipercaya. Nilai ditulis sebagai teks (`RAW`), jadi jawaban peserta yang diawali `=` tidak berjalan sebagai rumus. Tiap pembuatan dicatat di jejak audit acara (`export.sheet`) dan dibatasi 6 kali per 10 menit per pengguna, dihitung dari jejak itu sehingga berlaku lintas instance. Maksimal 5.000 baris.

### Sheet tidak dihapus otomatis

Sheet yang dibuat bertahan sampai dihapus. Aplikasi tidak menghapusnya, dan pengurus yang diajak berbagi (peran penulis) tidak bisa menghapus berkas milik akun lain. Semua sheet ada di Drive akun organisasi pemilik token, dikelompokkan per acara:

```
PPIT Nanjing - Ekspor Google Sheets
└── WIF 2026 X CGT                          (satu folder per acara, bernama judul acara)
    ├── PPIT Pendaftar - WIF 2026 X CGT - 2026-10-26 16:10 (jam Tiongkok)
    └── PPIT Evaluasi - WIF 2026 X CGT - 2026-10-26 16:20 (jam Tiongkok)
```

Folder acara dicari lewat id acara (disimpan di properti berkas), bukan lewat nama, jadi dua acara berjudul sama tidak tercampur dan folder otomatis diganti namanya kalau judul acara berubah. Folder dibuat saat ekspor pertama sebuah acara. Kalau pemilik menghapus folder, folder dibuat ulang pada ekspor berikutnya. Yang boleh menghapus sheet hanya pemilik akun itu: buka Drive-nya, masuk ke folder acara, lalu pindahkan sheet yang sudah tidak dipakai ke Sampah.

Sheet pendaftar berisi nama, email, WeChat, dan jawaban formulir (paspor, telepon, dan bukti mahasiswa sudah dibuang). Karena disimpan di luar situs, bersihkan folder itu secara berkala, misalnya setelah laporan acara selesai. Jejak siapa membuat sheet apa ada di riwayat acara (`export.sheet`).

### Kenapa bukan service account

Dicoba lebih dulu dan tidak bisa. Service account yang dipakai modul Dokumen (`GOOGLE_DRIVE_SA_JSON`) punya kuota Drive 0 (`about.get` mengembalikan `storageQuota.limit = 0`), dan folder akar `GOOGLE_DRIVE_ROOT_FOLDER_ID` dimiliki service account itu sendiri, bukan Shared Drive (organisasi memakai akun Gmail biasa, bukan Google Workspace). Dicoba dengan kredensial di `.env` pada 2026-10-25:

| Percobaan | Hasil |
|---|---|
| `files.create` folder di folder akar | Berhasil |
| `files.create` Google Sheet atau Docs di folder akar | Gagal: `The user's Drive storage quota has been exceeded` |
| `spreadsheets.create` lewat Sheets API | Gagal: `The caller does not have permission` |
| `files.create` unggah berkas teks 1 baris | Gagal: `Service Accounts do not have storage quota` |

Mengaktifkan Sheets API tidak mengubah itu. Yang dibutuhkan adalah pemilik berkas yang punya kuota: sebuah akun Google biasa (jatah gratis 15 GB, dan Google Sheet tidak memakan jatah itu).

### Menyalakan mode Sheet

Hanya dikerjakan sekali oleh Divisi Teknologi.

1. Di Google Cloud (project klien OAuth `AUTH_GOOGLE_ID`), aktifkan **Google Sheets API** dan **Google Drive API**.
2. Di klien OAuth "Web application" yang sama, tambahkan Authorized redirect URI `http://localhost:53682/oauth2callback`.
3. Di **OAuth consent screen**, pastikan status **In production**. Status Testing membuat refresh token kedaluwarsa tiap 7 hari dan tombolnya diam-diam jatuh ke pesan galat. Scope yang dipakai `drive.file` bukan scope sensitif, jadi tidak perlu verifikasi Google.
4. Di komputer sendiri jalankan `npx tsx --env-file=.env scripts/google-drive-oauth-token.ts --write-env`. Buka alamat yang dicetak, **masuk sebagai akun organisasi yang akan memiliki berkasnya** (bukan akun pribadi), lalu setujui. Token ditulis ke `.env` lokal tanpa dicetak. Tanpa `--write-env`, token dicetak di terminal.
5. Isi `GOOGLE_DRIVE_REFRESH_TOKEN` di Vercel (Production) lewat dashboard, lalu deploy ulang.

Token itu kredensial jangka panjang ke Drive akun tersebut, terbatas pada berkas yang dibuat aplikasi ini (`drive.file`). Jangan ditempel di chat atau commit. Kalau bocor atau tidak dipakai lagi, cabut di https://myaccount.google.com/permissions dan buat ulang.

Kalau token berhenti berlaku (dicabut, atau status consent screen kembali Testing), pembuatan Sheet menjawab "Izin Google untuk Sheets sudah tidak berlaku" dan tombol Salin tetap bisa dipakai. Ulangi langkah 4 dan 5.

## Batasan

- Semua baris dikirim ke browser sekaligus, lalu dipecah per 100 di sisi klien. Untuk ratusan baris ini ringan. Kalau satu tabel bisa mencapai ribuan baris, halamannya perlu dipindah ke server.
- Check-in dan pembatalan pendaftaran tidak ada di tabel. Keduanya tetap di tampilan Daftar.
- Pilihan kolom dan filter tidak disimpan. Muat ulang halaman mengembalikannya ke bawaan.
- Tab Respons evaluasi dan tampilan Daftar pendaftar masih menulis waktu dengan zona waktu browser, bukan jam Tiongkok.
