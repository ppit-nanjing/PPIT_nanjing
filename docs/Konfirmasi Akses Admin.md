# Konfirmasi Akses Admin per Divisi

> Dokumen ini menutup **Known Gap #5** di [Progress & Handoff.md](./Progress%20&%20Handoff.md): sebagian `adminModuleScope` masih **diduga** dari deskripsi tugas di buku panduan rekrutmen, belum dikonfirmasi pengurus. Isi tabel di bawah diambil langsung dari database produksi (Neon) pada 2026-08-17, bukan dari file seed — dan saat itu keduanya masih identik, artinya belum ada yang mengubahnya lewat UI.
>
> **Cara memperbaiki setelah dikonfirmasi:** `/console/organization` → edit divisi → centang modul. Tidak perlu ubah kode atau database.

## Yang perlu dijawab pengurus

Tiga pertanyaan di bawah ini yang benar-benar penting. Sisanya sekadar untuk ditinjau sekilas.

### 1. ⚠️ Divisi Usaha Dana bisa mengekspor seluruh data sensus mahasiswa. Benar?

Usaha Dana punya scope `reports`. Di `src/lib/admin-scope-constants.ts`, `reports` membuka `/console/reports` — **termasuk tombol ekspor CSV berisi data sensus seluruh mahasiswa** (nama, universitas, program studi, kontak darurat, dan seterusnya).

Scope ini **diduga**, bukan dikonfirmasi. Untuk divisi yang tugasnya penggalangan dana, akses ke data pribadi seluruh anggota terasa lebih luas dari yang dibutuhkan. Kalau yang dimaksud hanya laporan keuangan, saat ini **belum ada** modul laporan keuangan terpisah — jadi pilihannya: cabut aksesnya, atau biarkan sampai modul itu dibuat.

### 2. ⚠️ Divisi Hubungan Masyarakat juga bisa mengekspor data sensus. Benar?

HuMas punya scope `sensus`. Meski namanya terkesan hanya "ringkasan", `sensus` dan `reports` **membuka halaman yang sama persis** — termasuk tombol ekspor CSV tadi. Ini penyederhanaan yang memang disengaja dan sudah tercatat sebagai Known Gap #6, tapi efek nyatanya: **dua divisi non-BPH bisa mengunduh data pribadi seluruh anggota.**

### 3. Divisi Kultura bisa menerbitkan berita, bukan cuma galeri. Disengaja?

Kultura diberi `events` + `gallery`. Tapi `gallery` adalah alias dari modul `content`, jadi Kultura sebenarnya mendapat **seluruh** modul Konten — termasuk membuat dan menerbitkan artikel berita, bukan hanya mengunggah foto. Kalau maksudnya benar-benar hanya galeri, modul `content` perlu dipecah dulu (pekerjaan kode, bukan sekadar centang).

## Kondisi saat ini — seluruh divisi

| Divisi | Scope tersimpan | Yang sebenarnya bisa diakses | Status |
|---|---|---|---|
| **Teknologi** | `grantsFullAdminAccess` | Semua modul, setara BPH | Dikonfirmasi (pemilik situs) |
| **Logistik** | `inventory` | Inventaris: barang, peminjaman, sumbangan, pengadaan | Wajar |
| **Akademia** | `events` | Kegiatan: buat, edit, absensi | Wajar |
| **Pemberdayaan Sosial** | `events` | Kegiatan: buat, edit, absensi | Wajar |
| **Kultura** | `events`, `gallery` | Kegiatan **+ seluruh Konten (termasuk terbitkan berita)** | ⚠️ Lihat pertanyaan 3 |
| **Komunikasi & Konten** | `content`, `gallery` | Konten: berita + galeri | **Diduga** |
| **Desain** | `content` | Konten: berita + galeri | **Diduga** |
| **Hubungan Masyarakat** | `sensus`, `content` | Konten **+ Laporan, termasuk ekspor data sensus** | ⚠️ Lihat pertanyaan 2 |
| **Usaha Dana** | `reports` | Laporan, **termasuk ekspor data sensus** | ⚠️ **Diduga** — lihat pertanyaan 1 |

Empat departemen induk (BPH, Program & Acara, Komunikasi & Media, Sumber Daya & Pengembangan) tidak punya scope apa pun — ini memang benar. Akses admin melekat pada divisi, bukan departemen induknya.

Modul `users`, `organization`, dan `feedback` sengaja **tidak bisa didelegasikan** sama sekali — hanya BPH bertier `full`. Modul `notifications` (template pesan otomatis) juga sama.

## Draf pesan untuk pengurus

> Halo, aku lagi finalisasi hak akses admin di web PPIT Nanjing. Ada 3 hal yang perlu dikonfirmasi:
>
> 1. **Usaha Dana** sekarang bisa mengunduh data sensus seluruh mahasiswa (nama, kampus, prodi, kontak darurat). Ini memang diperlukan, atau sebaiknya dicabut?
> 2. **Hubungan Masyarakat** juga bisa mengunduh data sensus yang sama. Sesuai kebutuhan?
> 3. **Kultura** selain kegiatan juga bisa menerbitkan artikel berita, bukan cuma unggah foto galeri. Disengaja?
>
> Kalau ada yang perlu diubah, tinggal bilang — aku bisa langsung sesuaikan.
