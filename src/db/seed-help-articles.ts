// One-off seed for the "Dokumentasi" tab (help_articles) + inline guide-button
// content. Idempotent: re-running updates existing rows by slug instead of
// duplicating them, so it's safe to run again after editing this file.
//
// Run with: npx tsx --env-file=.env src/db/seed-help-articles.ts [slug ...]
// Tanpa argumen SEMUA artikel di-upsert dan menimpa isi yang mungkin sudah
// diedit lewat /console/docs. Sebut slug-nya (mis. "karier") untuk hanya
// menulis artikel baru tanpa menyentuh yang lain.
import { db } from "./index";
import { helpArticles } from "./schema";
import { sql } from "drizzle-orm";

const SERING_DIPAKAI = "Sering Dipakai";
const SERING_BINGUNG = "Sering Membingungkan";

const articles: { slug: string; section: string; title: string; content: string }[] = [
  {
    slug: "dashboard",
    section: SERING_DIPAKAI,
    title: "Dashboard — Ringkasan Aktivitas",
    content: `Halaman ini murni ringkasan, tidak ada yang perlu diisi.

- Ringkasan: angka utama semua modul (anggota, sensus, kegiatan, dst).
- Perlu Perhatian: daftar item yang butuh tindakan (lamaran menunggu, masukan baru, permintaan peminjaman, dst) — klik "Tinjau" untuk langsung ke modul terkait.
- Aksi Cepat: jalan pintas ke alur kerja yang sering dipakai.
- Aktivitas Terbaru: gabungan masukan, pendaftaran kegiatan, dan lamaran membership terbaru, diurutkan dari yang paling baru.

Kalau "Perlu Perhatian" kosong, itu artinya semua sudah tertangani — bukan halamannya rusak.`,
  },
  {
    slug: "pengguna",
    section: SERING_DIPAKAI,
    title: "Pengguna — Kelola Akun Anggota",
    content: `Undang Anggota (undangan massal)
Satu baris per orang di kotak teks: "Nama, email@contoh.com" atau cukup "email@contoh.com" saja. Baris yang formatnya tidak seperti email dilewati begitu saja (tidak error). Email yang sudah terdaftar juga dilewati, tidak ditimpa. Akun baru berstatus "invited" tanpa password — orangnya baru bisa masuk setelah login Google atau daftar manual di /signup pakai email yang sama.

Edit pengguna (per baris)
- Nama, Email: wajib diisi. Email harus format valid dan belum dipakai akun lain.
- Role/akses admin: pilih dari daftar role, atau "Tanpa akses admin".
- Divisi: pilih satu departemen/divisi — mengganti ini otomatis melepas divisi lama, satu orang cuma bisa di satu divisi.
- Status: Aktif / Nonaktif / Ditangguhkan. (Status "invited" cuma muncul otomatis dari undangan massal, tidak bisa dipilih manual di sini.)

Hapus akun
Tidak bisa dibatalkan, dan tidak bisa menghapus akun sendiri. Kalau orang itu kepala departemen, jabatan itu dikosongkan; lamaran membership dan masukan yang pernah dia kirim tetap tersimpan tapi jadi "anonim".

Modul ini sensitif — cuma admin "full" (BPH) yang bisa memberi akses modul Pengguna ke departemen lain.`,
  },
  {
    slug: "organisasi",
    section: SERING_DIPAKAI,
    title: "Organisasi — Struktur Departemen & Akses Admin",
    content: `Tambah/Edit Departemen atau Divisi
- Nama: wajib diisi.
- Deskripsi: opsional.
- Divisi hanya bisa ditambahkan di dalam Departemen (satu tingkat saja, divisi tidak bisa punya sub-divisi lagi).
- Urutan tampil bisa diatur naik/turun pakai panah, tapi cuma di antara sesama level (departemen dengan departemen, divisi dengan divisi dalam departemen yang sama).

Akses admin per departemen
- "Akses admin penuh": semua anggota departemen itu jadi admin penuh (bisa segalanya). Cuma admin full (BPH) yang bisa mencentang/melepas ini — kalau bukan BPH yang submit, centangan ini diabaikan diam-diam.
- "Modul admin yang bisa diakses": centang modul spesifik (Kegiatan, Inventaris, Laporan, Sensus, Konten, Galeri, Dokumen, Tautan, dst). Tiga modul — Pengguna, Organisasi, Masukan Pengguna — cuma bisa diberikan oleh BPH; kalau admin biasa mencoba mencentangnya, centangan itu diabaikan dan yang lain tetap tersimpan.

Tidak ada tombol hapus departemen di halaman ini — kalau perlu menghapus, hubungi developer.

Setiap perubahan di sini (buat/ubah/urutkan) otomatis tercatat di Log Audit (link di bagian bawah halaman).`,
  },
  {
    slug: "kegiatan",
    section: SERING_DIPAKAI,
    title: "Kegiatan — Buat & Kelola Acara",
    content: `Field Buat/Edit Kegiatan (form "Info & Pengaturan Acara" terbagi 2 bagian; tiap field ada label + keterangan)
- Judul: wajib.
- Kategori, Lokasi: teks bebas. Kategori jadi tab filter di /events; untuk acara online, tulis platformnya di Lokasi (mis. "Zoom Meeting (Online)").
- Link peta 1/2: opsional, untuk acara offline — teks Lokasi di halaman publik jadi tombol petunjuk arah.
- Tanggal & jam mulai: wajib. Jam selesai: opsional tapi isi — dipakai sebagai penanda "sudah lewat" dan awal penguncian panitia (14 hari setelahnya).
- Kapasitas: angka, minimal 1; kosong = tanpa batas.
- "Hanya peserta yang sensusnya lengkap": centang kalau mau membatasi pendaftar.
- Gambar Sampul: upload atau tempel URL, rasio 16:9.
- Batas Pendaftaran: opsional — lewat tanggal ini, pendaftaran otomatis ditutup. Kosongkan kalau tidak ada batas.
- Jadwal Rilis Publikasi: opsional — kalau diisi, acara tetap tersembunyi ("Terjadwal") sampai tanggal itu, lalu terbit otomatis. Kosongkan kalau mau tetap Draft sampai dipublikasikan manual.
- Agenda: teks bebas, satu baris per item.
- Info Setelah Daftar + QR Kontak: tampil di halaman tiket peserta SETELAH mendaftar (bukan di halaman publik) — taruh di sini tautan masuk acara online (Zoom dll.) atau ajakan masuk grup WeChat.

Soal status (draft/terjadwal/terbit/dst)
- Tombol "Buat & Lanjut Edit" mengikuti Jadwal Rilis Publikasi (kalau diisi → terjadwal, kalau kosong → draft).
- Tombol "Simpan sebagai Draft" SELALU memaksa jadi draft, walau Jadwal Rilis Publikasi sudah diisi.
- Kalau kamu isi Jadwal Rilis Publikasi tapi status manual masih "draft", sistem otomatis mengubahnya jadi "terjadwal" — jangan bingung kalau statusnya berubah sendiri.

Struktur Kepanitiaan
Bikin divisi acara (nama wajib, bisa punya sub-divisi), lalu tugaskan siapa saja (tidak harus anggota departemen tertentu) + peran + divisi. Menugaskan ulang orang yang sama di acara yang sama cuma mengganti perannya, bukan bikin baris dobel.

Divisi Penanggung Jawab
Field di halaman detail acara: divisi kabinet pemilik acara/proker ini (boleh lebih dari satu untuk proker gabungan). Efeknya: anggota divisi itu otomatis melihat & mengelola acara tersebut di menu Kegiatan — ASAL divisinya sudah dicentang modul "Kegiatan" oleh admin penuh di Organisasi → edit divisi. Baris PJ ini menyempitkan akses pemegang modul ke acara divisinya, bukan memberi modul baru; kalau divisi PJ belum punya centang "Kegiatan" (mis. Humas untuk acara Sosialisasi), mintakan dulu ke admin penuh. Hanya BPH Kabinet/Divisi Teknologi (admin penuh) yang boleh mengubah field ini. Acara yang belum punya Divisi Penanggung Jawab hanya terlihat admin penuh dan pembuatnya.

Pertanyaan Pendaftaran
Di halaman detail acara. Kosong = form pendaftaran standar. Tambahkan pertanyaan (Teks Pendek/Panjang, Dropdown, Pilihan, Pilih Banyak) bila acaranya butuh — mis. preferensi makanan atau ukuran kaos; centang "Wajib diisi" supaya tidak bisa dilewati. Jawabannya muncul di kolom Peserta pada Daftar Pendaftar. Menghapus pertanyaan tidak menghapus jawaban yang sudah tersimpan, cuma berhenti ditampilkan.

Hapus kegiatan & Sampah (khusus BPH Kabinet)
- Tombol "Hapus" tidak langsung menghapus: kegiatan dipindah ke Sampah. Kegiatan di Sampah hilang dari situs publik, dari daftar kegiatan, dan dari akses panitia, tapi pendaftar, panitia, evaluasi, dan datanya tetap tersimpan. Formulir/Oprek milik acara itu juga tidak bisa diisi lagi.
- Bagian "Sampah" ada di bawah Daftar Kegiatan. "Pulihkan" mengembalikan kegiatan dengan status semula — kalau statusnya publik, langsung tampil lagi di situs.
- "Hapus Permanen" hanya bisa dari Sampah dan TIDAK bisa dibatalkan: pendaftar, panitia, evaluasi ikut terhapus. Album galeri yang tertaut tidak ikut terhapus, hanya dilepas tautannya. Sertifikat yang sudah terbit tetap ada.
- Setiap pindah ke Sampah, pemulihan, dan hapus permanen tercatat di Log Audit.`,
  },
  {
    slug: "work-ledger",
    section: SERING_BINGUNG,
    title: "Work Ledger — Beban Kepanitiaan, Pembayaran, Sertifikat",
    content: `Halaman ini BUKAN pengganti halaman Kegiatan — ini tampilan lintas-acara supaya kelihatan siapa kebanyakan jadi panitia, plus dua alat tambahan: verifikasi pembayaran dan sertifikat. Sejak akses Kegiatan dibuat spesifik per acara, Work Ledger hanya menampilkan acara yang boleh kamu lihat (BPH Kabinet/Divisi Teknologi tetap melihat semua).

Tugaskan Panitia
- Acara, Pengurus (siapa saja): wajib pilih.
- Peran: ketua, wakil, sekretaris, bendahara, supervisor, anggota. Nama seperti humas/acara/logistik itu DIVISI — buat divisinya lewat halaman Kegiatan, jangan dipilih sebagai peran.
- Catatan tugas: opsional.
Menugaskan orang yang sama di acara yang sama cuma mengganti perannya, tidak bikin baris dobel.

Beban Kepanitiaan
Daftar baca-saja. Hitungan dan peringatan beban (3 acara atau lebih) hanya dihitung dari kepanitiaan AKTIF — acara yang sudah selesai/dibatalkan atau tanggal mulainya sudah lewat ditandai "Selesai" dan tidak menambah beban, tapi tetap tampil sebagai riwayat. Tombol "Lepas" hanya melepas satu penugasan itu.

Verifikasi Pembayaran
Bagian ini hanya terlihat oleh akun ber-scope ORGANISASI — catatan finansial sengaja tidak dibuka ke semua admin acara, jadi bendahara acara harus punya scope itu dulu. Daftar di sini cuma penunjuk lintas-acara; verifikasi sesungguhnya ada di halaman detail Kegiatannya (konteks biaya + kolom catatan ada di sana). Sebelum menekan Terverifikasi, cocokkan nominal, nama pengirim, dan waktu transfer dengan mutasi Alipay/rekening — bukti diunggah sendiri oleh peserta, belum tentu benar.

Sertifikat
- Penerima: wajib.
- Acara: opsional.
- Jenis: peserta/panitia/pemateri/lainnya.
- Judul: wajib, teks bebas (mis. "Sertifikat Panitia Divisi Acara").
- Tautan berkas: WAJIB berupa tautan https:// (PDF-nya dibuat di luar aplikasi; boleh Google Drive — upload langsung belum didukung). Sertifikat tidak dianggap terbit sebelum tautannya diisi, dan hanya https yang diterima (http/javascript/data ditolak). Pakai penyimpanan yang bisa dibuka dari Tiongkok: Google Drive sering terblokir tanpa VPN.
- Mengganti tautan pada sertifikat yang sudah terbit hanya memperbarui tautannya — tanggal terbit tetap, notifikasi tidak dikirim ulang.
- Sertifikat TANPA berkas (sisa aturan lama) tidak tampil di profil penerima; menempel tautan padanya membuatnya terbit.
Hapus sertifikat langsung permanen, tidak ada konfirmasi.

Terbit sertifikat massal peserta/panitia TIDAK lagi dari sini — sekarang dari halaman detail Kegiatan (section "Sertifikat Peserta" / "Sertifikat Panitia"): pakai tautan per orang, "Tempel banyak sekaligus", atau simpan satu **tautan folder** lalu "Terbitkan semua yang berhak" (praktis kalau semua PDF dikumpulkan dalam satu folder Drive; yang sudah punya tautan diganti ke folder tanpa notifikasi ulang). Sertifikat peserta hanya untuk yang sudah di-scan hadir DAN sudah mengisi evaluasi sambil masuk akunnya. Cukup simpan tautan folder: yang sudah berhak langsung dapat, dan yang mengisi evaluasi belakangan otomatis dapat saat evaluasinya terkirim.`,
  },
  {
    slug: "inventaris",
    section: SERING_BINGUNG,
    title: "Inventaris — Barang, Peminjaman, Pengadaan",
    content: `Tambah Barang
- Nama Barang, Jumlah Total: wajib (jumlah minimal 1 — ini juga jadi stok tersedia awal).
- Kategori, Lokasi Penyimpanan, Pemegang, Deskripsi, Foto: opsional.

Pengajuan Peminjaman / Sumbangan / Pengadaan (dari anggota)
Admin cuma tinggal klik Setujui/Tolak — tidak ada field yang diisi admin di sini. Setuju peminjaman otomatis mengurangi stok tersedia, "Tandai Kembali" mengembalikannya. Untuk sumbangan, admin bisa pilih "gabung ke barang existing" atau biarkan kosong untuk bikin barang baru. Untuk pengadaan yang sudah disetujui, ada tombol "Tandai Terpenuhi" setelah barangnya benar-benar dibeli.

Pinjam Keluar (Eksternal) — beda dengan peminjaman anggota di atas
- Barang, Nama Peminjam: wajib.
- Jumlah: minimal 1, tidak boleh lebih dari stok tersedia (kalau lebih, muncul error "Stok tidak cukup").
- Kondisi Saat Keluar: pilih dari 5 opsi (Baru/Baik/Cukup Baik/Rusak/Pensiun).
- Kontak Peminjam, Perkiraan Tanggal Kembali, Tujuan: opsional.
Saat barang kembali, isi ulang Kondisi Saat Kembali dari daftar yang sama — stok otomatis dikembalikan.

Log Audit Inventaris cuma tampilan baca-saja, dibuat otomatis dari setiap aksi di atas — tidak ada yang perlu diisi manual di sana.`,
  },
  {
    slug: "pendaftaran",
    section: SERING_DIPAKAI,
    title: "Pendaftaran — Formulir Rekrutmen & Review Lamaran",
    content: `Setelan Formulir (/console/membership/form)
Atur Judul, Deskripsi, Pesan Konfirmasi, dan beberapa centang: tampilkan banner, tanyakan email lewat pertanyaan (kalau mati, email diambil otomatis dari akun login), acak urutan, tampilkan progres, jadikan kuis (kalau aktif, tiap pertanyaan bisa punya poin & kunci jawaban), pertanyaan baru otomatis wajib diisi. Tautan Spreadsheet opsional, cuma ditampilkan sebagai link — tidak otomatis sinkron.

Tambah pertanyaan
Isi Label + pilih Tipe (teks, textarea, email, telepon, angka, pilihan, dst). Bisa juga pakai "Bagian" untuk membagi formulir jadi beberapa tahap, atau ambil dari Bank Pertanyaan yang sudah disiapkan. Pilihan jawaban (untuk tipe select/radio/multiselect) diisi satu baris per opsi.

Review lamaran (per pendaftar)
- Status: Menunggu / Sudah Ditinjau / Diterima / Ditolak. Mengganti ke Diterima atau Ditolak otomatis mengirim email keputusan + notifikasi ke pendaftar (kalau dia punya akun) — TAPI cuma sekali, mengganti ke status yang sama lagi tidak mengirim ulang.
- Catatan Panitia: teks internal, TIDAK terlihat oleh pendaftar.
- Hapus lamaran: permanen.

Halaman Jawaban punya tombol Ekspor CSV — satu baris per pendaftar, satu kolom per pertanyaan.`,
  },
  {
    slug: "konten",
    section: SERING_DIPAKAI,
    title: "Konten — Berita & Galeri",
    content: `Tulis Berita Baru
- Judul: wajib.
- Foto Sampul: opsional, upload atau URL.
- Kategori: opsional.
- Isi berita: ada tombol bantuan AI "Perbaiki" dan "Review" kalau mau dibantu merapikan tulisan.
- Centang "Publikasikan sekarang": kalau dicentang langsung terbit; kalau tidak, tersimpan sebagai draft dan bisa diterbitkan belakangan.
Judul tidak perlu unik — sistem otomatis bikin slug + kode acak supaya tidak bentrok.

Album Baru
Judul Album wajib, Foto Sampul opsional. Setelah dibuat, kamu masuk ke halaman album itu untuk menambah foto satu-satu (tiap foto: URL gambar wajib, keterangan opsional).

Soal upload gambar (berlaku di semua tempat upload: berita, galeri, inventaris)
Maksimal 10 MB, format PNG/JPEG/WEBP saja. PENTING: pilih file dulu, lalu klik tombol Upload terpisah untuk dapat URL-nya sebelum submit form — memilih file saja belum otomatis meng-upload.`,
  },
  {
    slug: "katalog",
    section: SERING_BINGUNG,
    title: "Kota & Katalog — Tempat, Kampus, Merchandise, Donasi",
    content: `Halaman ini gabungan beberapa hal berbeda yang semuanya menampilkan konten publik (Tempat, Kampus, Katalog):

- Tempat: Nama wajib, sisanya (kategori, distrik, alamat, gambar, tautan peta) opsional.
- Wilayah Naungan: cuma 9 kota tetap, batas wilayahnya tidak bisa diedit — yang bisa diubah cuma jumlah mahasiswa, kontak, catatan per kota.
- Distrik: Nama wajib — mengisi nama yang SAMA dengan yang sudah ada akan MENGUPDATE distrik itu, bukan bikin baru.
- Universitas: Nama & Kota penting diisi, checkbox "Kampus mitra" untuk yang berstatus mitra resmi.
- Merchandise: ini cuma etalase, BUKAN toko — tidak ada checkout. "Catatan pemesanan" biasanya diisi cara pesan (mis. lewat WhatsApp).
- Sponsor & Mitra: Nama wajib, Tingkat pilih dari Mitra/Silver/Gold/Platinum.

Kanal & Laporan Donasi (cuma muncul untuk admin dengan akses Organisasi, bukan semua admin Konten)
Kanal Donasi cuma menampilkan info rekening/QR — situs TIDAK memproses pembayaran apa pun. Kanal bisa diedit (tombol Edit — termasuk ganti QR/rekening) atau disembunyikan sementara lewat Sembunyikan/Tampilkan; tidak perlu hapus lalu bikin ulang. Laporan Donasi berisi laporan yang dikirim SENDIRI oleh donatur (self-report); sebelum menandai "Terverifikasi", cek dulu manual ke mutasi rekening — jangan percaya angka yang diketik donatur begitu saja. Tombol Export CSV mengunduh rekap untuk LPJ (termasuk catatan internal dan tautan bukti — perlakukan sebagai data finansial).

Semua tombol Hapus di halaman ini meminta konfirmasi dulu, lalu menghapus permanen.`,
  },
  {
    slug: "laporan",
    section: SERING_BINGUNG,
    title: "Laporan — Ekspor Data & Ringkasan Sensus",
    content: `Field yang perlu diisi (semuanya di satu form):
- Jenis Laporan (wajib): Kehadiran Kegiatan, Audit Inventaris, Ringkasan Sensus, Ekspor Data Mahasiswa, atau Custom.
- Departemen: dipakai untuk filter Kehadiran Kegiatan & Ekspor Data Mahasiswa — diabaikan untuk jenis lain.
- Dari/Sampai Tanggal: dipakai untuk Kehadiran Kegiatan & Audit Inventaris — diabaikan untuk jenis lain.
- Cabang (khusus Ringkasan Sensus): default "Nanjing" (cabang kita sendiri) — ganti ke "Semua cabang" kalau memang butuh data cabang lain.
- Kelengkapan (khusus Ringkasan Sensus): default "Hanya yang lengkap" — ini SENGAJA, karena cuma data lengkap yang diterima sistem pusat PPI Tiongkok. Jangan ganti ke "Semua" kecuali memang untuk keperluan internal, bukan untuk dikirim ke pusat.
- Catatan: cuma dipakai untuk jenis Custom.

Ringkasan Sensus berisi data pribadi lengkap (nomor paspor, tanggal lahir, nomor telepon) — perlakukan hasil unduhannya sebagai data sensitif, jangan sebar sembarangan.

Setiap laporan yang dibuat tercatat di "Riwayat Laporan" (siapa, kapan, jenis apa) — tidak ada yang hilang diam-diam.`,
  },
  {
    slug: "notifikasi",
    section: SERING_BINGUNG,
    title: "Notifikasi — Ubah Teks Notifikasi Otomatis",
    content: `PENTING, sering disalahpahami: halaman ini BUKAN alat kirim pengumuman/broadcast. Tidak ada tombol "kirim ke semua". Yang bisa diubah di sini cuma TEKS dari notifikasi otomatis yang sudah ada (mis. "pendaftaran kegiatan dikonfirmasi", "peminjaman disetujui/ditolak", "lamaran membership diterima/ditolak") — kirimnya tetap otomatis dipicu oleh kejadian di sistem, bukan oleh kamu klik kirim.

Cara edit per template
- Judul notifikasi, Isi pesan: keduanya wajib.
- Bisa pakai placeholder seperti {{eventTitle}}, {{itemName}}, {{fullName}} — kalau nilainya tidak tersedia saat dikirim, placeholder itu jadi kosong (bukan tulisan {{...}} yang muncul).
- Tombol "Kembalikan ke bawaan" menghapus versi kustommu dan balik ke teks default aplikasi.
- Ada pratinjau di bawah form yang menampilkan hasil akhirnya dengan contoh data.

Dua template (lamaran diterima/ditolak) JUGA dikirim lewat email, pakai teks yang sama persis dengan yang di sini — mengedit satu berarti mengedit dua channel sekaligus.

Modul ini cuma bisa diakses admin full (BPH), tidak bisa didelegasikan ke departemen manapun.`,
  },
  {
    slug: "dokumentasi",
    section: SERING_DIPAKAI,
    title: "Dokumentasi — Cara Pakai Halaman Ini Sendiri",
    content: `Halaman ini adalah wiki internal buat pengurus — tempat menyimpan panduan yang tidak muat di tombol Panduan singkat di tiap halaman.

- "Tulis Panduan": Judul, Bagian (kelompok tampil — pakai "Sering Dipakai" atau "Sering Membingungkan" supaya konsisten dengan tombol Panduan di halaman lain), Isi Panduan (teks biasa, tidak ada markdown — baris baru akan tersimpan apa adanya).
- Klik salah satu panduan untuk membaca isinya lengkap + form "Edit Panduan Ini" di bagian bawah buat mengubah.
- Changelog: catatan rilis fitur baru, diisi lewat form Versi + Ringkasan (+ Detail opsional) — ini murni riwayat, tidak memengaruhi aplikasi.

Tombol Panduan (ikon "?") yang muncul di pojok halaman-halaman console lain mengambil isinya dari sini juga (dicocokkan lewat slug) — kalau mau mengubah isi tombol Panduan suatu halaman, edit artikel dengan slug yang sesuai di sini.`,
  },
  {
    slug: "masukan",
    section: SERING_DIPAKAI,
    title: "Masukan Pengguna — Triase Laporan dari Widget Feedback",
    content: `Halaman ini baca-saja untuk isi laporan — masukan datang dari widget feedback yang muncul di seluruh situs (bug, desain, ide fitur, komentar umum). Admin tidak mengisi apa-apa selain menandai status.

- Filter: Kategori (bug/desain/fitur/umum) dan Status (Baru/Sedang Ditinjau/Selesai) — cuma buat menyaring tampilan, tidak mengubah data.
- Tombol status per item: klik Baru / Sedang Ditinjau / Selesai untuk mengubah — langsung tersimpan, tidak ada konfirmasi, jadi hati-hati salah klik.
- "Salin Semua" / salin per-item: menyalin teks masukan ke clipboard, tidak mengubah apa pun di sistem.

Tiap masukan menampilkan email pengirim (atau "Anonim" kalau dikirim tanpa login), halaman asal, dan kadang elemen halaman yang ditandai pengirim — berguna buat tahu persis apa yang mereka maksud.

Modul ini ditandai sensitif — cuma admin full (BPH) yang bisa memberi akses ke departemen lain.`,
  },
  {
    slug: "tautan",
    section: SERING_BINGUNG,
    title: "Tautan — Short Link & Periode Kepengurusan",
    content: `Buat/Edit Tautan
- Judul, URL tujuan: wajib. URL harus diawali http:// atau https://.
- Slug: opsional — kalau kosong, diambil otomatis dari Judul. PENTING: kalau slug sudah dipakai tautan lain, sistem MENOLAK dengan error, TIDAK otomatis menambah akhiran acak — kamu harus ganti manual.
- Kategori: Dokumentasi/Berkas/Formulir/Lainnya.
- Periode kepengurusan: pilih yang sudah ada, ATAU isi kotak "Periode baru" untuk bikin periode baru langsung dari sini (kalau namanya sama persis dengan yang sudah ada, dipakai ulang, tidak dobel).
- Kedaluwarsa: opsional — lewat tanggal ini link ditandai "Kedaluwarsa" di daftar, tapi TIDAK otomatis nonaktif total.
- Tautan aktif: checkbox ini cuma muncul saat Edit (tautan baru selalu aktif dari awal).

Kelola periode kepengurusan (buka "Kelola periode kepengurusan" di atas daftar tautan)
Bikin periode baru cukup isi nama (mis. "2026/2027"). Periode BARU TIDAK otomatis jadi aktif — klik "Tandai Aktif" di daftar periode untuk menjadikannya periode yang dipakai modul Dokumen. Cuma satu periode yang bisa aktif; menandai satu otomatis menonaktifkan yang lain.

Kalau lupa menandai aktif, modul Dokumen tidak akan membuatkan folder untuk periode baru itu — anggota tetap melihat folder periode lama.`,
  },
  {
    slug: "dokumen",
    section: SERING_BINGUNG,
    title: "Dokumen — Berkas Google Drive per Divisi",
    content: `Berkas TIDAK disimpan di aplikasi ini — cuma di Google Drive milik akun yang folder root-nya dipakai (bukan Gmail pribadi siapa pun, dan bukan penyimpanan tanpa batas). Aplikasi cuma jadi "pintu" ke folder itu.

Kamu TIDAK perlu bikin folder manual di Drive. Alurnya:
1. Pastikan ada periode kepengurusan yang AKTIF (lihat panduan Tautan — kelola & tandai aktif di sana).
2. Buka halaman Dokumen sekali (sebagai admin di /console/documents, atau anggota di /documents) — folder untuk periode itu, dan subfolder per divisi, dibuat otomatis saat pertama kali diakses.

Hak akses per orang
- Admin dengan modul "Dokumen" (atau full): bisa tulis di SEMUA folder, semua periode, semua divisi.
- Anggota biasa: cuma bisa upload/ubah/hapus di folder DIVISINYA SENDIRI, pada periode yang sedang aktif. Divisi lain cuma bisa dibuka & dibaca (badge "Baca saja"), tidak bisa diedit.

Upload
Setiap file yang di-upload otomatis: (1) dibuatkan izin "siapa saja yang punya link → hanya baca", dan (2) dibuatkan short link /l/xxx yang juga muncul di halaman Tautan. Batas ukuran file saat ini sekitar 4 MB (batasan platform hosting, bukan pilihan aplikasi) — file lebih besar dari itu akan gagal di-upload.

Menghapus (Hapus) sebuah file memindahkannya ke sampah Drive dan menonaktifkan short link-nya otomatis.`,
  },
  {
    slug: "evaluasi-acara",
    section: SERING_DIPAKAI,
    title: "Evaluasi Acara — Kuesioner Pasca-Acara",
    content: `Setelah acara selesai, peserta bisa mengisi evaluasi lewat tautan publik /events/<slug>/evaluasi (tanpa perlu akun). Tombol "Isi Evaluasi" juga otomatis muncul di halaman acara begitu tanggal acara sudah lewat.

Menyebarkan
- Dari halaman console acara, buka section "Tautan Pendaftaran & Evaluasi" → klik "Buat tautan pendek + QR (keduanya)" — satu klik membuat tautan pendaftaran DAN evaluasi (slug otomatis daftar-<slug-acara> & eval-<slug-acara>; kalau sudah pernah dibuat, tautan yang sama dipakai ulang). Unduh QR-nya, tempel di grup WeChat. Targetnya relatif, jadi QR tetap hidup walau situs pindah domain. Modul Tautan tetap bisa dipakai untuk tautan lain.
- Satu perangkat hanya bisa mengisi SEKALI. Kalau ada yang salah isi dan mau mengulang dari perangkat yang sama, hapus dulu barisnya di console (lihat di bawah), baru orang itu bisa isi lagi.

Identitas
- Nama & kota opsional. Kalau peserta mencentang "Kirim sebagai anonim", nama dan kota TIDAK disimpan sama sekali.

Aturan pengisian
- Semua pertanyaan wajib diisi — rating 1-10 maupun pertanyaan teks — kecuali "Heartwarming message for panitia" yang opsional.

Melihat hasil
- Buka /console/events/<id> → section "Evaluasi Acara".
- Ada ringkasan rata-rata + grafik kecil distribusi nilai 1-10 untuk tiap pertanyaan, plus semua jawaban teks.
- Tombol CSV / Excel untuk mengunduh rekap (buat LPJ).
- Tombol hapus (ikon tempat sampah) di tiap respons untuk membuang jawaban spam/uji coba.`,
  },
  {
    slug: "evaluasi-panitia",
    section: SERING_BINGUNG,
    title: "Evaluasi Panitia — Menilai Kerja Kepanitiaan Bersama",
    content: `Evaluasi panitia dipakai setelah acara untuk menilai kerja sama divisi dan kepanitiaan secara keseluruhan, bukan menilai orang per orang. Yang mengisi hanya panitia acara itu sendiri, wajib login, dan masing-masing cukup sekali.

Siapa yang mengatur
- BPH Panitia acara itu (ketua, wakil, sekretaris, bendahara, supervisor) dan BPH Kabinet.
- Anggota panitia lain hanya melihat berapa orang yang sudah mengisi, tanpa nama dan tanpa isi jawaban.
- 14 hari setelah acara selesai, acara terkunci: BPH Panitia hanya bisa membaca rekap; perubahan lewat BPH Kabinet.

Membuka evaluasi
1. Buka /console/events/<id> → section "Evaluasi Acara" → tab "Panitia".
2. Isi jendela pengisian: "Buka" dan "Tutup" (jam Tiongkok). Tombol "Buka setelah acara" mengisi keduanya otomatis: buka saat acara selesai, tutup 3/7/14 hari kemudian.
3. Klik "Simpan jendela". Saat pertama kali disimpan, pertanyaan template (lima penilaian bintang 1–5 + tiga pertanyaan teks) otomatis disiapkan.
4. Salin "Tautan pengisian untuk grup panitia" lalu bagikan ke grup panitia. Jangan bagikan tautan evaluasi peserta ke grup panitia — itu form yang berbeda.

Mengubah pertanyaan
- Section "Pertanyaan Evaluasi" → tab "Panitia". Tambah, ubah, atau hapus pertanyaan seperti builder evaluasi peserta.
- Tipe pertanyaan terkunci setelah ada jawaban.
- Jangan hapus semua pertanyaan saat jendela terbuka: form panitia akan menampilkan "Evaluasi belum disiapkan".

Siapa yang bisa membaca jawaban
- Jawaban tercatat atas nama akun pengisi beserta divisinya. Yang bisa membaca nama dan isinya hanya BPH Panitia acara itu dan BPH Kabinet. Pengisi diberi tahu hal ini di form-nya.

Melihat hasil
- Tab "Panitia" di section "Evaluasi Acara": rata-rata tiap penilaian, grafik, dan semua jawaban teks.
- Tombol CSV / Excel untuk rekap LPJ.
- Respons bisa dihapus (misalnya salah isi); setiap penghapusan tercatat di Riwayat Audit acara.`,
  },
  {
    slug: "karier",
    section: SERING_BINGUNG,
    title: "Lowongan — Memasang, Memproses Lamaran, dan SOP Menerima Perusahaan",
    content: `Siapa yang bisa akses
Menu Lowongan muncul kalau divisimu dicentangi modul "Lowongan" oleh admin penuh (Organisasi → edit divisi → centang "Lowongan"). Dulu menu ini bernama "Karier"; isinya sama. Untuk instalasi baru, yang dapat otomatis adalah Divisi Usaha Dana. Kalau menunya tidak ada, itu sebabnya.

SOP: perusahaan menghubungi PPIT untuk memasang lowongan
1. Catat siapa yang menghubungi, dari perusahaan mana, posisi apa, dan untuk mahasiswa/lulusan seperti apa. Simpan percakapannya di folder Dokumen.
2. Pastikan perusahaannya nyata: ada situs atau profil resmi, ada email kantor (bukan email gratis), dan ada kontak yang bisa dihubungi balik. Kalau ragu, minta satu pengurus lain ikut memeriksa sebelum dipasang.
3. Tolak atau tunda kalau: pelamar diminta membayar apa pun, nama perusahaan tidak mau disebut, deskripsi kerjanya tidak jelas, atau perusahaan meminta data pribadi (nomor paspor, rekening) di tahap lamaran.
4. Tanyakan sejak awal siapa yang akan menerima CV, dan minta perusahaan setuju data pelamar hanya dipakai untuk proses rekrutmen lowongan itu.
5. Setelah lolos pemeriksaan, baru pasang lowongannya (langkah di bawah).

Memasang lowongan (/console/jobs → Tambah Lowongan)
- Judul, Perusahaan, Jenis pekerjaan: wajib.
- Lokasi, Batas lamaran, Deskripsi, Persyaratan: opsional.
- Poster (opsional): unggah gambar poster di kolom "Poster / gambar lowongan". Gambar diunggah apa adanya (tidak dipotong), tampil di samping kanan halaman lowongan dan sebagai thumbnail di daftar Lowongan (publik dan console) — poster potret paling pas. Tautan yang kamu tempel di Deskripsi/Persyaratan otomatis bisa diklik pembaca.
- Kotak "Langsung buka untuk pelamar": kalau dicentang, lowongan langsung tampil di halaman Jobs (/jobs, "Career Opportunities in Nanjing"). Kalau dikosongkan, lowongan tersimpan tertutup: tidak tampil di daftar dan tidak bisa dilamar, tapi halamannya TETAP bisa dibaca siapa pun yang punya tautannya. Jadi bukan draf rahasia, dan jangan bagikan tautannya sebelum dibuka.
- Membagikan tautan lowongan: buka lowongannya di console, lalu klik "Salin tautan" (tombol "Lihat publik" membuka halamannya langsung) — tempel tautan itu ke grup atau chat. Pembaca juga bisa memakai tombol "Bagikan" di halaman lowongan: di HP membuka menu berbagi (WhatsApp/WeChat), di komputer menyalin tautan.
- Batas lamaran DITEGAKKAN otomatis: begitu tanggalnya lewat, lowongan tidak bisa dilamar lagi (tombol lamar diganti keterangan) dan tampil abu-abu. Paling banyak 3 lowongan lewat batas yang tetap tampil abu-abu di /jobs; sisanya pindah ke halaman Arsip (/jobs/archive), bersama lowongan yang kamu tutup manual.

Cara melamar (pilih satu per lowongan)
- Lewat form PPIT (bawaan): pelamar mengunggah CV dan cover letter, kamu meninjaunya di console seperti di bawah.
- Lewat situs perusahaan: isi tautan https resmi milik perusahaan. Anggota yang login dan sensusnya lengkap lalu klik "Lamar di Situs Perusahaan" dan dialihkan ke sana. PPIT TIDAK menerima data pelamar sama sekali, jadi tidak ada daftar pelamar, status, atau notifikasi; yang tercatat hanya jumlah klik di daftar lowongan. Data yang dikirim pelamar di situs itu menjadi urusan perusahaan.
- Sebelum menyimpan tautan eksternal: pastikan itu situs resmi perusahaan (bukan formulir pribadi seseorang), dan coba bukanya, kalau bisa dari jaringan di Tiongkok, karena layanan Google sering tidak terbuka dari sana. Tautan ke situs PPIT sendiri ditolak.
- Mengganti cara melamar dari form PPIT ke tautan tidak menghapus lamaran yang sudah masuk; tetap bisa ditinjau di console.

Menutup, membuka, menghapus lowongan
- Tutup: keluar dari daftar aktif /jobs dan tidak bisa dilamar lagi, termasuk lewat tautan lama; lowongannya pindah ke halaman Arsip (/jobs/archive). Lamaran yang sudah masuk tetap ada. Ini pilihan normal kalau lowongan sudah selesai.
- Buka lagi: tampil dan bisa dilamar lagi.
- Hapus: permanen, dan ikut menghapus SEMUA lamarannya (tercatat di log audit: siapa, lowongan apa, berapa pelamar). Hanya untuk lowongan salah input atau spam. Berkas CV yang sudah diunggah pelamar tidak ikut terhapus dari penyimpanan.

Memproses lamaran (klik lowongan → Pelamar → klik nama)
- Kamu melihat email pelamar, tautan CV, dan cover letter.
- Status berjalan: Terkirim → Sedang direview → Tahap wawancara → Diterima / Ditolak. Saat status berubah, pelamar otomatis dapat notifikasi (muncul di lonceng), tapi hanya sekali: menyimpan status yang sama tidak mengirim ulang. Notifikasi tidak bisa ditarik. Kalau kamu hanya mau mencatat status tanpa memberi tahu pelamar (misalnya salah pilih dan mau dibetulkan dulu), kosongkan kotak "Kirim notifikasi ke pelamar" sebelum Simpan Status.
- "Diterima" artinya pelamar lolos atau mendapat tawaran, belum tentu sudah resmi bekerja.
- Catatan Pengurus: internal, TIDAK terlihat pelamar. Disimpan terpisah dari status, jadi menyimpan catatan tidak mengubah status.
- Riwayat Status mencatat siapa mengubah apa dan kapan.

Aturan data pelamar
- CV dan email pelamar hanya untuk proses lowongan itu. Jangan dibagikan ke grup atau pihak lain tanpa persetujuan pelamar.
- Meneruskan CV ke perusahaan dilakukan lewat email resmi PPIT setelah pelamar tahu dan setuju, bukan lewat chat grup.
- Tautan CV harus berupa alamat http(s) (unggahan atau tautan Drive); yang lain ditolak saat melamar. Klik tautan CV hanya kalau kamu mengenali asalnya.
- Pelamar minta datanya dihapus, langkahnya berurutan:
  1. Buka lamarannya dan salin tautan CV-nya dulu.
  2. Klik Hapus Lamaran. Jangan hapus lowongannya, karena itu membuang lamaran orang lain juga.
  3. Berkas CV-nya TIDAK ikut terhapus, karena disimpan terpisah di Vercel Blob (folder "resume"). Minta Divisi Teknologi menghapus berkas dari tautan yang tadi disalin. Kalau CV-nya tautan Drive milik pelamar sendiri, tidak ada yang perlu dihapus.`,
  },
  {
    slug: "panduan-maba",
    section: SERING_DIPAKAI,
    title: "Panduan Maba — Menulis, Meninjau, dan Merawat Topiknya",
    content: `Panduan Maba adalah 23 artikel bantuan yang isinya guidebook untuk maba. Sembilan di antaranya hasil ekstraksi PDF pusat, empat belas sisanya ditulis Divisi Teknologi: delapan topik pengetahuan sehari-hari (transportasi dalam kota, kuliner, kesehatan dan darurat, musim dan cuaca, nomor penting, spot wisata, perpanjangan paspor dan SKB, bahasa Mandarin) dan enam topik penutup celah terhadap PDF sumber (VPN dan akses internet, packing dan kirim barang, checklist minggu pertama, tempat ibadah, kerja/magang/SIM, festival dan hari libur). Maba melihatnya di dua tempat: halaman **/guidebook** (daftar topik per fase, ada kotak centang kalau dia login) dan chatbot Help Center. Chatbot hanya boleh mengutip topik yang **sudah ditinjau dan belum kedaluwarsa** — ini yang paling sering bikin bingung, jadi baca bagian "Aturan yang mengikat" di bawah.

Dari mana isinya datang
- Sumber mentahnya markdown di docs/guidebook/ (satu berkas per topik), hasil ekstraksi PDF. Ada di repo, bukan di database.
- Jalur masuknya: npx tsx --env-file=.env src/db/ingest-guide.ts [slug]. Perintah ini menulis versi sumber ke parsed_markdown, mengisi Isi Panduan kalau masih kosong, membangun ulang potongan pencarian, dan menaikkan corpus_version supaya cache jawaban lama tidak dipakai lagi. Tanpa slug, semua topik diproses. Tambah --force hanya kalau memang mau menimpa isi yang sudah disunting pengurus.
- Yang disunting pengurus adalah **Isi Panduan** (kolom content). Jangan menyunting parsed_markdown: itu baseline panel merge. Panel merge bisa mengembalikan satu bagian ke versi sumber kalau suntinganmu kacau.
- Versi Inggrisnya opsional, satu berkas per topik di docs/guidebook/en/ dengan nama yang sama. Berbeda dari kolom Indonesia, isi Inggris selalu ditimpa saat ingest karena itu hasil terjemahan mesin, bukan suntingan pengurus — jadi perbaikan terjemahan dikerjakan di berkas Inggrisnya, bukan di console. Kalau berkasnya belum ada, /help menampilkan teks Indonesia.

Mengisi satu topik (/console/docs → pilih topiknya)
- Judul, Isi Panduan (markdown + tab pratinjau).
- Fase dan Urutan dalam fase: dua kolom ini yang menentukan urutan di /guidebook.
- Tampilkan di halaman publik (/help): nyalakan kalau artikelnya untuk anggota juga.
- Status tinjauan: "Tandai sudah ditinjau hari ini" menulis tanggalnya; "Batalkan tinjauan" menghapusnya kembali.
- Masa berlaku: topik baru otomatis dapat 6 bulan kalau pilihan "Biarkan" dibiarkan. Isi yang aturannya bisa berubah (imigrasi, KIP, bank) memang sebaiknya punya tanggal.
- Di bawah form ada panel "Status Topik Guidebook": tinjauan, masa berlaku, jumlah potongan pencarian, dan versi chunker. Kalau "Potongan pencarian" nol, topiknya tidak akan pernah ketemu chatbot walau isinya panjang.

Aturan yang mengikat
- **Belum ditinjau = draf.** Chatbot tidak mengutipnya sama sekali, dan di /guidebook topiknya bertanda "Belum ditinjau pengurus". Maba yang bertanya soal topik itu akan menerima "Belum ada panduan yang cocok" — bukan jawaban karangan.
- **Kedaluwarsa = sama tidak dipakai.** Lewat tanggalnya, topik itu keluar dari pencarian chatbot sampai ditinjau ulang dan tanggalnya diperbarui.
- Isi visa dan izin tinggal wajib ditinjau orang yang tahu aturannya (BPH atau pusat). Salah tanggal di topik ini artinya chatbot mengutip aturan lama.
- **Jangan menaruh data pribadi** (nomor paspor, nomor telepon, alamat rumah) di artikel panduan. Isinya bisa ikut terkirim ke penyedia model saat chatbot menjawab.

Chatbot-nya sendiri
- Jawaban di widget membawa tiga hal tambahan: daftar **Sumber** yang bisa diklik (tiap baris menuju halaman artikelnya di /help, jadi maba bisa membaca aslinya), sampai tiga **saran pertanyaan lanjutan**, dan tombol **suka/tidak suka**.
- Suara itu tersimpan di ai_query_log.feedback (satu suara per jawaban, bisa diganti) dan tampil di /console/docs/guidebook, panel **Suara Pengguna**: yang "tidak suka" di atas, lengkap dengan pertanyaannya dan artikel yang dikutip saat menjawab. Yang banyak "tidak membantu" adalah daftar periksa isi topik: biasanya potongannya kurang, bukan modelnya salah. Angka targetnya di docs/Guidebook Maba.md bagian KPI.
- Saran lanjutan datang dari model, dan tiap saran diuji dulu ke pencarian supaya tombolnya tidak berakhir "belum ada panduan". Jawaban yang tidak butuh saran boleh tanpa saran sama sekali; daftar FAQ di src/lib/guidebook-faq.ts dipakai waktu modelnya tidak dipanggil (kuota habis, sakelar mati, Groq error) atau waktu jawabannya penolakan, dan daftar itu juga yang dipakai prewarm.
- Batas 15 pertanyaan per pengguna per hari, dihitung per tanggal Asia/Shanghai. Habis kuota, sakelar mati, atau Groq error: jawabannya tetap potongan panduan yang paling relevan plus kalimat penjelas, bukan halaman error.
- Sakelar darurat ada di database, tanpa deploy: set guide_meta.ai_enabled = false.
- Cache jawaban diikat ke corpus_version, jadi menyimpan satu topik otomatis menyegarkan jawaban lama untuk pertanyaan yang sama. Perubahan pada prompt atau pada susunan konteks ditandai dengan menaikkan ANSWER_FORMAT_VERSION di src/lib/guide-answer.ts; angka itu ikut jadi kunci cache, jadi jawaban lama tidak dipakai lagi. Setelah naik, jalankan prewarm sekali lagi kalau stok jawabannya mau tetap hangat.
- Tiap artikel dikirim ke model sebatas dua jendela teks - satu jendela paling banyak 1.800 karakter yang diambil dari blok paling banyak memuat kata kunci pertanyaannya, plus satu jendela di bagian lain artikel kalau di sana masih ada baris yang memuat kata kuncinya (windowAroundTerms di src/lib/guidebook-terms.ts), total tidak lebih dari 3.600 karakter - bukan dari paragraf pembuka. Artinya artikel panjang aman, tapi bagian yang menjawab pertanyaan tetap harus memuat kata-kata yang dipakai maba (sebut "kirim barang" di bagian kirim barang, jangan cuma "logistik pengiriman" di judul bagian). Kalau pertanyaannya cuma disebut di ringkasan atas sementara bagian jawabannya memakai istilah lain, chatbot bisa menjawab "panduannya tidak memuat itu" padahal isinya ada.
- Versi Inggris juga ikut dinilai saat pencarian, jadi pertanyaan berbahasa Inggris hanya ketemu kalau berkas di docs/guidebook/en/ ada atau sinonimnya menjembatani. Topik yang fileEn-nya kosong tetap bisa terjawab, tapi lewat jalur sinonim — bukan lewat judul Inggrisnya.
- Jawaban dibatasi 60 kata, atau 120 kata kalau isinya memang daftar langkah/alamat/tarif/syarat. Batas ini di prompt (src/lib/groq.ts), bukan di widget: kalau jawaban terasa kurang lengkap, yang perlu ditambah adalah bagian artikelnya, bukan batasnya.
- Prewarm (opsional, menjelang musim maba): npx tsx --env-file=.env.local scripts/prewarm-guide.ts menjawab daftar FAQ di src/lib/guidebook-faq.ts lebih dulu, supaya maba pertama tidak menunggu.
- Uji mutu: npx tsx --env-file=.env.local src/db/eval-guidebook.ts menjalankan 101 pertanyaan dari docs/guidebook-golden.json dan mencetak recall@4 plus daftar pertanyaan yang luput. Ambang lulusnya 0,80; KPI-nya 0,85. Tanda pending_review di berkas itu diisi tangan; hapus tanda itu begitu topiknya ditinjau, kalau tidak harness-nya tetap merah. Tambahkan pertanyaan baru ke berkas yang sama setiap kali ada topik baru atau ada pertanyaan maba yang dijawab salah.
- Uji logika pencarian tanpa database: npm run check:guidebook (71 pemeriksaan kata kunci, sinonim, entitas, jendela konteks, renderer, dan format pinyin).

Kalau chatbot bilang "Belum ada panduan yang cocok"
1. Cek topiknya di /console/docs: sudah ditinjau? belum kedaluwarsa? potongan pencariannya ada?
2. Cek istilah yang dipakai pertanyaannya. Artikel panduan memakai kata Indonesia, sedangkan maba sering bertanya dalam bahasa Inggris; padanannya ada di SYNONYMS di src/lib/guidebook-terms.ts. Kalau istilah barunya belum ada di sana, tambahkan dulu. Dua hal yang pernah bikin salah: kata yang berbeda bisa punya batang kata yang sama (makanan dan makan sama-sama jadi makan, jadi tidak menambah hitungan kata yang cocok), dan lantai relevansinya menuntut minimal tiga kata kunci yang cocok (kalau pertanyaannya cuma punya dua kata kunci, keduanya harus cocok). Kalau kata yang dipakai maba memang belum ada di artikelnya, tambahkan ke artikelnya lalu ingest ulang dengan --force.
3. Kalau pertanyaannya memang belum ada topiknya, itu jawaban yang benar — catat pertanyaannya dan ajukan topik baru, jangan mengarang isi.`,
  },
  {
    slug: "panduan-maba-kartu-tempat",
    section: SERING_DIPAKAI,
    title: "Panduan Maba — Kartu Tempat di Jawaban Chatbot",
    content: `Kartu tempat muncul di bawah gelembung jawaban chatbot: satu kartu per tempat yang jawaban itu sebut, berisi nama tempat, satu baris keterangan pendek (alamat dari baris korpus yang sama), dan tombol ikon rute di kanan yang membuka tempat itu di Amap pada tab baru. Isinya bukan teks karangan model — namanya dari baris tempat di artikel panduan yang terambil saat pertanyaan itu dijawab, dan tautannya tautan di baris yang sama. Jadi maba tetap dapat tautannya walau model lupa menyalinnya.

Kenapa jawaban tidak lagi menuliskan tempat satu per satu
Nama dan alamat tempat sudah tampil di kartu, jadi jawaban cukup ringkasan pengelompokan: di distrik mana tempatnya berkumpul, jalur metro apa yang melayani, dan nama tempatnya disebut di dalam kalimat supaya kartunya ketemu. Alamat, bus, dan pintu keluar metro per tempat baru ditulis kalau pertanyaannya memang soal tempat itu. Untuk pertanyaan "ada masjid di Nanjing?", yang dijawab lebih dulu masjid di dalam kota (净觉寺, 草桥, 吉兆营); masjid di luar kota ada di pertanyaan lanjutan "masjid di luar kota Nanjing apa saja?".

Perakitannya di server: src/lib/guide-answer.ts memuat potongan guide_chunks milik artikel yang menang di pencarian (maksimal 4 artikel), lalu placeButtons (src/lib/chat-places.ts) memakai teks gabungan potongan itu sebagai indeks tempat. Satu baris butir yang namanya ditulis tebal adalah satu tempat (- **净觉寺 Jingjue Mosque** — ...), dan tautannya tautan markdown di baris itu. Hasilnya dikirim lewat ChatResult.places (src/app/actions/ai.ts). Aturannya:

- Urutannya urutan kemunculan nama tempat di dalam teks jawaban, bukan urutan skor pencarian.
- Yang dapat kartu cuma tempat yang jawabannya sebut. Tempat di artikel yang tidak disebut jawabannya tidak dapat kartu, dan tempat yang disebut tapi barisnya tidak memuat tautan juga tidak dapat kartu — tautan tidak pernah dikarang.
- Nama tempat dikenali dari bentuk hanzi (净觉寺) atau romanisasinya (Jingjue Mosque), dua-duanya diambil dari penanda tebal baris itu. Alias Amap sesudah nama tebal (Amap: 草桥寺) tidak ikut jadi keterangan kartu.
- Keterangan di kartu dipotong sekitar 120 karakter di batas kata, jadi yang tampil alamat singkat, bukan seluruh isi baris.
- Maksimal 12 kartu (MAX_PLACES), dan tautan yang sama cuma tampil sekali.
- Daftar tempat lengkap juga ikut ke model lewat blok "Indeks tempat di artikel ini" (placeIndex), satu baris per tempat, maksimal 12 baris. Jadi angka di jawaban bisa dicek ke indeks itu walau potongan teks artikelnya cuma memuat dua-tiga baris, dan pertanyaan soal satu tempat tetap dijawab alamat serta rute metronya.
- Tidak ada baris tempat bertautan di artikelnya berarti tidak ada kartu. Artikel yang memang tidak menyebut tempat apa pun wajar menghasilkan nol kartu.

Bentuk URL yang dipakai korpus
Dua bentuk tautan Amap sama-sama diterima placeButtons: halaman POI amap.com/place/<id> dan pencarian kata kunci uri.amap.com/search?keyword=…&city=…&src=ppit-nanjing. Kalau satu baris memuat beberapa tautan, yang dipakai tautan host amap.com pertama. Contoh tautan pencarian yang dipakai korpus:

https://uri.amap.com/search?keyword=<nama hanzi>&city=<南京>&src=ppit-nanjing

Tautan pencarian tetap menghasilkan kartu: tombol rutenya membuka hasil pencarian nama tempat itu di Amap, dan label tautannya "Rute Amap" seperti di korpus. Tautan non-Amap tetap ditolak — tautan tidak pernah dikarang.

Nama tempat di keyword dan kota di city di-encode persen. Contoh dari docs/guidebook/tempat-ibadah-di-nanjing.md, 净觉寺 jadi:

https://uri.amap.com/search?keyword=%E5%87%80%E8%A7%89%E5%AF%BA&city=%E5%8D%97%E4%BA%AC&src=ppit-nanjing

Tempat yang halaman POI-nya belum ketemu tetap dapat kartu lewat tautan pencarian; ganti ke amap.com/place/<id> kalau halaman POI-nya sudah ada, supaya tombolnya langsung membuka tempat, bukan hasil pencarian. Kalau sebuah pertanyaan tempat dijawab tanpa kartu, periksa dulu baris korpusnya punya tautan Amap (POI atau pencarian) dan namanya disebut di jawaban.

Label tautannya bebas ([净觉寺] atau [Masjid Jingjue] sama saja) karena yang dibaca cuma alamatnya. src=ppit-nanjing jangan dihapus. Tautan pencarian kata kunci (pola di atas) memakai GCJ-02 tanpa koordinat di artikel: kalau tombolnya menunjuk tempat yang salah, yang perlu dibetulkan adalah nama hanzi di keyword, bukan angka lintang-bujur.

Yang dicek kalau kartunya hilang
1. Tautannya benar-benar tautan markdown di baris tempat itu, bukan URL yang ditempel apa adanya di baris lain.
2. Nama tempatnya ditulis tebal di awal baris butir, dan pertanyaannya menyebut nama itu.
3. Topiknya sudah ditinjau, belum kedaluwarsa, dan potongan pencariannya tidak nol (syarat yang sama seperti chatbot boleh mengutipnya; cek panel Status Topik Guidebook di /console/docs).
4. Pertanyaannya memang menyentuh artikel itu: jawabannya cuma menyinggung tempat dari artikel yang terambil, jadi pertanyaan visa yang tidak menyinggung artikel tempat ibadah menghasilkan nol tombol walau tautannya lengkap.
5. Tombolnya selalu dihitung ulang di server saat menjawab, dari teks jawaban yang dipakai saat itu plus potongan terbaru: menyunting baris tempatnya langsung terlihat. Setelah menyunting isi, jalankan npx tsx --env-file=.env.local src/db/ingest-guide.ts [slug] supaya potongan pencariannya ikut diperbarui.

Tidak perlu menyentuh kode atau database: cukup tempel tautannya di artikel, lalu ingest ulang topiknya.`,
  },
  {
    slug: "oprek",
    section: SERING_BINGUNG,
    title: "Formulir & Oprek — Pemilu, BPH Acara, dan Kepanitiaan",
    content: `Apa ini
Menu Formulir untuk rekrutmen internal kabinet. Semua form di sini hanya bisa diisi pengurus kabinet (terdaftar di Struktur Organisasi): Pemilu (pendaftaran calon periode berikutnya), Oprek BPH Acara (rekrut BPH untuk satu acara), dan Oprek Kepanitiaan (rekrut panitia acara per divisi). Form Pendaftaran PPIT (publik) tetap di menu Pendaftaran.

Siapa yang bisa akses
- BPH Inti + Divisi Teknologi: semua tab, semua acara.
- Koordinator Divisi: tab Oprek BPH Acara — setiap koor boleh membuat form untuk proker divisinya.
- BPH Acara (ketua/wakil/sekretaris/bendahara/supervisor hasil Oprek): tab Oprek Kepanitiaan untuk acaranya — Oprek Kadiv dan Oprek anggota.
- Kadiv acara (hasil Oprek Kadiv): Oprek anggota acaranya — boleh membuat formnya, melihat SEMUA pelamar semua divisi, dan memutuskannya; penempatan hanya sebagai peran anggota divisi (tidak bisa mengangkat BPH/Kadiv).
- Anggota kabinet biasa: hanya MENGISI form; tidak melihat hasil pelamar.

Alur Oprek BPH Acara
1. Pastikan acaranya sudah dibuat lebih dulu di menu Kegiatan.
2. Formulir → Oprek BPH Acara → isi judul, pilih acara, centang posisi yang dibuka (minimal satu).
3. Susun pertanyaan (Tambah Pertanyaan / Bank Pertanyaan), lalu nyalakan "Buka untuk pengisian".
4. Bagikan tautannya (Salin tautan / Bagikan) ke grup. Penerima wajib login sebagai pengurus kabinet.
5. Tinjau di bagian Pendaftar → klik pelamar: jawaban lengkap, atur status (Menunggu/Diterima/Ditolak) dan role, lalu Simpan Penempatan. Yang DITERIMA otomatis tercatat sebagai panitia acara itu.
6. Analitik dan ekspor CSV/Excel ada di halaman form yang sama.

Alur Oprek Kadiv (ketua divisi)
1. Setelah BPH Acara terbentuk dan divisi acaranya dibuat di Struktur Kepanitiaan, BPH Acara membuat Oprek Kadiv di tab Oprek Kepanitiaan.
2. Pelamar memilih divisi yang ingin dipimpin (Pilihan 1 wajib, Pilihan 2 opsional).
3. Hanya BPH Acara (atau BPH Inti/Tech) yang memutuskan. Yang diterima otomatis tercatat sebagai Kadiv divisinya dan mendapat menu Formulir untuk mengelola Oprek anggota.

Alur Oprek anggota (Oprek Kepanitiaan)
1. SATU formulir untuk semua divisi. Dibuat oleh BPH Acara atau Kadiv acara tersebut (atau BPH Inti/Tech).
2. Pelamar memilih Divisi Pilihan 1 (wajib) dan Pilihan 2 (opsional, harus beda) — daftarnya diambil dari Struktur Kepanitiaan acara.
3. Status penempatan: Menunggu → Diterima Pilihan 1 / Diterima Pilihan 2 / Dipindah divisi (pilih divisi) / Ditolak.
4. Diterima atau dipindah otomatis masuk Kepanitiaan acara (divisi + role, default anggota). Role dan divisi bisa diubah lewat dropdown, dan perubahannya mengirim notifikasi ke pelamar.
5. Menolak pelamar yang sebelumnya diterima menghapus baris panitianya — KECUALI dia masih diterima lewat form lain untuk acara yang sama, atau baris panitianya ditugaskan manual (bukan dari Oprek).

Pemilu
Form pendaftaran calon untuk kepengurusan periode berikutnya, khusus kabinet. Hanya BPH Inti + Divisi Teknologi yang mengelola.

Catatan penting
- Satu acara hanya punya SATU form Oprek BPH dan SATU form Oprek Kepanitiaan. Setelah form BPH dibuat, acaranya tidak muncul lagi di pilihan "Buat Formulir" Oprek BPH — lanjut ke Oprek Kepanitiaan setelah BPH-nya terbentuk. Kalau perlu mengulang rekrutmen, hapus dulu formulir lamanya (lamaran lama ikut terhapus).
- Semua form kabinet: satu orang satu kiriman per form, dan jawaban TIDAK bisa diedit sendiri — pelamar yang perlu mengubah jawaban harus menghubungi pengurus formnya (hapus lamarannya lewat tombol Hapus di halaman pelamar, lalu minta isi ulang).
- Lampiran file/gambar disimpan privat: hanya pemilik, pengelola form, dan BPH Inti/Divisi Teknologi yang bisa membuka.
- 14 hari setelah acara selesai, BPH Acara tidak bisa lagi mengubah penempatan (acara terkunci); hubungi BPH Kabinet/Divisi Teknologi.
- Notifikasi keputusan (diterima/ditolak/perubahan penempatan) dikirim in-app + email. Teksnya bisa diedit di menu Notifikasi → grup "Formulir & Oprek".
- Divisi Penanggung Jawab tiap acara diatur di halaman acara (menu Kegiatan) dan dipakai untuk filter laporan per divisi.`,
  },
];

async function main() {
  const only = process.argv.slice(2);
  const unknown = only.filter((slug) => !articles.some((a) => a.slug === slug));
  if (unknown.length > 0) throw new Error(`Slug tidak dikenal: ${unknown.join(", ")}`);
  const toSeed = only.length > 0 ? articles.filter((a) => only.includes(a.slug)) : articles;

  for (const a of toSeed) {
    await db
      .insert(helpArticles)
      .values({ slug: a.slug, section: a.section, title: a.title, content: a.content })
      .onConflictDoUpdate({
        target: helpArticles.slug,
        set: { section: a.section, title: a.title, content: a.content, updatedAt: sql`now()` },
      });
    console.log(`seeded: ${a.slug}`);
  }
}

main()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
