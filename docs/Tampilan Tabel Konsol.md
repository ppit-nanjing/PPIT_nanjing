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

## Batasan

- Semua baris dikirim ke browser sekaligus, lalu dipecah per 100 di sisi klien. Untuk ratusan baris ini ringan. Kalau satu tabel bisa mencapai ribuan baris, halamannya perlu dipindah ke server.
- Check-in dan pembatalan pendaftaran tidak ada di tabel. Keduanya tetap di tampilan Daftar.
- Pilihan kolom dan filter tidak disimpan. Muat ulang halaman mengembalikannya ke bawaan.
- Tab Respons evaluasi dan tampilan Daftar pendaftar masih menulis waktu dengan zona waktu browser, bukan jam Tiongkok.
