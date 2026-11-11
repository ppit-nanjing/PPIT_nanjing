# Konten (konsol)

> `/console/content`. Tempat pengurus mengelola Berita (`/news`) dan Galeri (`/gallery`). Dirombak 2026-11 dari masukan Vincent: tampilannya disamakan dengan daftar Kegiatan.

## Yang berubah (2026-11)

Dulu halaman ini berisi dua bagian lipat: daftar judul berita dengan tombol Arsipkan dan Hapus di tiap baris, dan kotak album yang hanya berisi judul. Sekarang bentuknya sama dengan papan Kegiatan (`src/components/console/events-board.tsx`):

- **Dua tab** dengan jumlah isinya: Berita (tanpa arsip) dan Galeri, ditambah kotak cari. Tab Galeri punya alamat sendiri, `?tab=galeri`. Tombol Kembali di halaman album dan di halaman Album Baru, juga hapus album, mendarat di tab itu.
- **Berita** dibagi menjadi tiga bagian: Draf, Terbaru (kartu besar seperti di `/news`), lalu Sudah Terbit (6 kartu pertama, sisanya lewat "Tampilkan Semua"). Arsip dilipat paling bawah, seperti Sampah di Kegiatan.
- **Kartu berita** menampilkan sampul, status (Draf / Terbit / Arsip), kategori, tanggal terbit, penulis, dan acara yang diliput. Judul membuka halaman edit.
- **Aksi pindah ke menu "⋯"**: Buka Halaman Publik, Arsipkan atau Pulihkan ke Draf, dan Hapus Permanen. Semuanya meminta konfirmasi dulu.
- **Kartu album** menampilkan sampul, jumlah foto dan sorotan, acara terkait (kalau namanya berbeda dari judul album), tanggal dibuat, dan peringatan kalau tautan album lengkap belum diisi.
- **Album tanpa foto sorotan** ditandai "Belum ada sorotan". Di atas daftar ada satu kalimat yang menghitung album seperti ini, karena `/gallery` hanya menampilkan foto sorotan, jadi album seperti itu tampil tanpa foto.

Tidak ada perubahan skema. Server Action tidak berubah, kecuali tujuan redirect `deleteGalleryAlbum` yang sekarang `?tab=galeri`.

## Berkas

| Berkas | Isi |
| --- | --- |
| `src/app/console/content/page.tsx` | Gerbang akses (`content`), dua query (berita + penulis + acara, album + hitungan foto), label tanggal |
| `src/components/console/content-board.tsx` | Papan klien: tab, cari, bagian Berita, kartu album, menu "⋯" |

## Aturan yang perlu diketahui

- **Tanggal** memakai `eventDayLabel` (zona Asia/Shanghai), sama dengan Kegiatan. Berita tidak punya kolom tanggal dibuat, jadi draf yang belum pernah terbit hanya bertuliskan "Belum pernah terbit".
- **Urutan berita**: `publishedAt` terbaru dulu, draf tanpa tanggal di ujung, lalu judul.
- **Sampul album di konsol**: sampul album, lalu foto sorotan pertama, lalu foto biasa pertama. Di `/gallery` urutannya berhenti di foto sorotan, jadi album tanpa sampul dan tanpa sorotan tampil kosong di sana.
- **Isi berita** hanya dikirim ke browser untuk kartu Terbaru (280 karakter pertama), seperti deskripsi di papan Kegiatan.
- **Akses**: halaman ini hanya untuk pemegang modul `content`. Panitia dengan hak "Post artikel" atau "Galeri" tetap mengelola berita dan album acaranya dari halaman acara.
