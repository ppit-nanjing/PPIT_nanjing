// One-off seed for the "Dokumentasi" tab (help_articles) + inline guide-button
// content. Idempotent: re-running updates existing rows by slug instead of
// duplicating them, so it's safe to run again after editing this file.
//
// Run with: npx tsx --env-file=.env src/db/seed-help-articles.ts
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
    content: `Field Buat/Edit Kegiatan
- Judul: wajib.
- Kategori, Lokasi: teks bebas.
- Tanggal & jam mulai: wajib.
- Kapasitas: angka, minimal 1.
- "Hanya peserta yang sensusnya lengkap": centang kalau mau membatasi pendaftar.
- Gambar Sampul: upload atau tempel URL, rasio 16:9.
- Batas Pendaftaran: opsional — lewat tanggal ini, pendaftaran otomatis ditutup. Kosongkan kalau tidak ada batas.
- Jadwal Rilis Publikasi: opsional — kalau diisi, acara tetap tersembunyi ("Terjadwal") sampai tanggal itu, lalu terbit otomatis. Kosongkan kalau mau tetap Draft sampai dipublikasikan manual.
- Agenda: teks bebas, satu baris per item.

Soal status (draft/terjadwal/terbit/dst)
- Tombol "Buat & Lanjut Edit" mengikuti Jadwal Rilis Publikasi (kalau diisi → terjadwal, kalau kosong → draft).
- Tombol "Simpan sebagai Draft" SELALU memaksa jadi draft, walau Jadwal Rilis Publikasi sudah diisi.
- Kalau kamu isi Jadwal Rilis Publikasi tapi status manual masih "draft", sistem otomatis mengubahnya jadi "terjadwal" — jangan bingung kalau statusnya berubah sendiri.

Struktur Kepanitiaan
Bikin divisi acara (nama wajib, bisa punya sub-divisi), lalu tugaskan siapa saja (tidak harus anggota departemen tertentu) + peran + divisi. Menugaskan ulang orang yang sama di acara yang sama cuma mengganti perannya, bukan bikin baris dobel.

Hapus kegiatan: album galeri terkait acara ini ikut terhapus, pendaftaran ikut terhapus otomatis.`,
  },
  {
    slug: "work-ledger",
    section: SERING_BINGUNG,
    title: "Work Ledger — Beban Kepanitiaan, Pembayaran, Sertifikat",
    content: `Halaman ini BUKAN pengganti halaman Kegiatan — ini tampilan lintas-acara supaya kelihatan siapa kebanyakan jadi panitia, plus dua alat tambahan: verifikasi pembayaran dan sertifikat.

Tugaskan Panitia
- Acara, Pengurus (siapa saja): wajib pilih.
- Peran: pilih dari daftar tetap (ketua, wakil, sekretaris, bendahara, humas, acara, logistik, dokumentasi, anggota).
- Catatan tugas: opsional.
Menugaskan orang yang sama di acara yang sama cuma mengganti perannya, tidak bikin baris dobel.

Beban Kepanitiaan
Daftar baca-saja. Yang sudah jadi panitia di 3 acara atau lebih ditandai peringatan (bukan larangan, cuma pengingat beban). Tombol "Lepas" hanya melepas satu penugasan itu.

Verifikasi Pembayaran
Cuma muncul untuk acara yang punya field "Biaya" terisi. Pilih status: Belum Perlu / Belum Bayar / Sudah Kirim Bukti / Terverifikasi / Ditolak. Set ke "Terverifikasi" untuk mencatat siapa & kapan yang memverifikasi.

Sertifikat
- Penerima: wajib.
- Acara: opsional.
- Jenis: peserta/panitia/pemateri/lainnya.
- Judul: wajib, teks bebas (mis. "Sertifikat Panitia Divisi Acara").
- Tautan berkas: opsional, harus link Google Drive — upload langsung belum didukung di sini.
Hapus sertifikat langsung permanen, tidak ada konfirmasi.

Terbit sertifikat massal per-divisi/per-acara dilakukan dari halaman detail Kegiatan, bukan dari sini — dan aman diklik ulang karena yang sudah punya sertifikat dilewati.`,
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
Kanal Donasi cuma menampilkan info rekening/QR — situs TIDAK memproses pembayaran apa pun. Laporan Donasi berisi laporan yang dikirim SENDIRI oleh donatur (self-report); sebelum menandai "Terverifikasi", cek dulu manual ke mutasi rekening — jangan percaya angka yang diketik donatur begitu saja.

Semua tombol Hapus di halaman ini langsung permanen, tidak ada konfirmasi.`,
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
];

async function main() {
  for (const a of articles) {
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
    console.log(`done: ${articles.length} help articles`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
