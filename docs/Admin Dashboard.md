# Admin Dashboard

> Bagian dari [Information Architecture](./Information%20Architecture.md). Titik masuk `/admin` untuk semua role admin.

## Layar

4 varian: `admin_console_master_dashboard` (kanonik), `admin_dashboard_connected_overview`, `admin_dashboard_overview`, `admin_console_navigation_updated`.

## Isi

Overview cepat lintas-modul: statistik ringkas (jumlah user aktif, event mendatang, pending borrow requests, pending job/membership applications), shortcut ke tiap modul, dan kemungkinan feed aktivitas terbaru (menyambung ke [AUDIT_LOG](./Data%20Dictionary.md)).

## Struktur navigasi (sidebar admin)

Dari analisis seluruh 29 layar admin, sidebar terbagi ke modul-modul berikut:

- [User & Role Management](./User%20&%20Role%20Management.md)
- [Organization Management](./Organization%20Management.md)
- [Event Management](./Event%20Management.md) — termasuk Work Ledger (`/console/work-ledger`) untuk kepanitiaan per-acara, verifikasi pembayaran, dan sertifikat
- [Inventory Management](./Inventory%20Management.md)
- [Reports & Analytics](./Reports%20&%20Analytics.md)
- [Documentation & Help Center](./Documentation%20&%20Help%20Center.md)

Pola navigasi: "Slide & Push" sidebar — lihat [Motion & Animation](./Motion%20&%20Animation.md).

## Akses

Dashboard & seluruh `/admin/*` di-gate oleh role (`ROLE` bukan `member`) via middleware + pengecekan scope di application layer (`requireModuleAccess`) — lihat [Tech Stack](./Tech%20Stack.md) dan [Data Dictionary](./Data%20Dictionary.md) § ROLE/PERMISSION. Department Head kemungkinan hanya melihat data departemennya sendiri (filter per `department_id` di query Drizzle), sementara Super Admin/Admin melihat semua.

## Akses per modul

Layout `/console` hanya memeriksa "boleh masuk konsol sama sekali" (admin, koordinator divisi, panitia acara, atau pengurus kabinet yang boleh membuat draf acara), jadi `src/app/console/page.tsx` menyaring sendiri.

### Tampilan (2026-11)

Masukan Vincent: dashboard berisi **cuplikan per modul** yang bisa diklik, bukan deretan angka. Urutannya dari atas:

1. **Judul** dan satu kalimat: tanggal hari ini dan jumlah hal yang menunggu tindakan.
2. **Perlu Tindakan**: antrean yang menunggu keputusan seseorang (acara menunggu persetujuan BPH, peminjaman terlambat, lamaran rekrutmen, lamaran Oprek, masukan baru, pendaftaran menunggu, pengajuan peminjaman, kontribusi, pengadaan). Setiap baris membuka modulnya. Draf tidak masuk sini; jumlahnya ada di kartu modulnya.
3. **Kartu modul** dari `src/components/console/dashboard-cards.tsx`. Seluruh kartu adalah tautan ke modulnya; acara di kartu Kegiatan membuka acaranya sendiri. Baris yang objeknya punya gambar asli (foto barang, sampul berita, gambar lowongan) menampilkan gambar kecilnya; kalau tidak ada satu pun, slot gambarnya tidak dibuat. Urutan: Kegiatan (satu baris penuh), lalu tiga baris bertiga: Pengguna, Pengurus, Sensus; Formulir, Inventaris, Masukan; Konten, Lowongan, Rekrutmen. Kartu yang modulnya tidak dipegang akun itu dilewati, dan sisanya tetap mengikuti urutan ini.
4. **Pita Dokumentasi** (`DocsStrip`): satu baris tipis selebar halaman di paling bawah, untuk semua akun konsol. Isinya jumlah panduan dan 3 artikel yang terakhir diperbarui (`help_articles.updated_at`). Seluruh pita membuka `/console/docs`; tiap judul membuka artikelnya.

Isi tiap kartu dan modul yang menjadi gerbangnya (`hasModuleAccess()`); query-nya hanya dijalankan kalau pemakai memegang modul itu:

| Kartu | Modul | Isi |
| --- | --- | --- |
| Kegiatan | `events` | Satu kolom per tahap yang ada isinya (Sedang berlangsung, Mendatang, Sedang disiapkan), sama lebar dan dipisah garis, masing-masing dengan jumlahnya. Acara pertama tiap kolom tampil besar dengan sampulnya; acara tanpa sampul mendapat plat tanggal, atau lambang PPIT kalau tanggalnya belum diisi. Juga pendaftar minggu ini dibanding minggu lalu |
| Kegiatan Saya | tanpa `events`, tapi panitia atau boleh membuat acara | Acara yang dia buat atau ikuti (`getPersonalEventIds()`, sama dengan daftar Kegiatan) |
| Inventaris | `inventory` | Jumlah jenis barang, unit tersedia dari total, hingga 3 peminjaman berjalan (terlambat lebih dulu) |
| Pengurus | `organization` | Jumlah pengurus, jumlah orang per divisi (4 pertama dalam urutan Organisasi) |
| Rekrutmen | `membership` | Lamaran menunggu, status periode, 3 lamaran terbaru |
| Masukan | `feedback` | Masukan baru dan totalnya, 3 masukan baru terbaru |
| Konten | `content` (alias `gallery`) | Berita terbit, draf, album dan foto, 3 berita terbaru |
| Lowongan | `career` | Lowongan dibuka, lamaran masuk, 3 lowongan terbaru |
| Sensus | `sensus` (bukan `sensus-verify`) | Sensus lengkap dari semua akun, yang belum lengkap, yang belum mengisi |
| Pengguna | `users` | Jumlah akun: aktif, diundang belum masuk, nonaktif atau ditangguhkan, baru bulan ini |
| Formulir | siapa pun yang bisa membuka menu Formulir (modul `forms`, BPH Panitia, Kadiv, koordinator, atau `canCreateSurvey`) | Formulir yang sedang dibuka dari formulir yang dia kelola, jumlah semua yang dia kelola, dan 3 formulir dengan jumlah jawaban atau pelamarnya. "Yang dia kelola" mengikuti `canManageForm` (`managedFormsScope` di `src/lib/survey-access.ts`). Lamaran Oprek yang belum diputuskan, dalam batas yang sama, masuk ke Perlu Tindakan |

- Semua angka berasal dari satu query gabungan (`fetchDashboardCounts()`), dan cuplikan tiap kartu berjalan bersamaan dengannya dalam satu putaran.
- Pemegang `events` yang bukan full admin hanya melihat angka dan acara yang bisa dibukanya: yang dia buat, yang divisinya jadi Divisi Penanggung Jawab, atau yang dia jadi panitianya (`getScopedEventIds()`, batas yang sama dengan `/console/events`). Full admin melihat semua acara.
- Grid 6 kolom di layar lebar: kartu Kegiatan memenuhi barisnya sendiri, kartu lain 2 kolom, dan sisa di baris terakhir dibagi rata (`dashboardSpans()`) supaya tidak ada sel kosong. Di tablet 2 kolom, di HP 1 kolom.
- Pengurus ranting (scope `sensus-ranting` saja) tetap dialihkan ke `/console/ranting/sensus`.
- Menambah kartu baru: daftarkan modulnya di `DASHBOARD_MODULES`, taruh subquery angkanya di `fetchDashboardCounts()` di bawah `if (access.<modul>)`, cuplikannya di `Promise.all` lewat `whenAllowed()`, lalu render kartunya hanya kalau grup hitungannya ada. Jangan menambahkan data modul lain tanpa gate.

## Pengalaman pertama pengurus baru (2026-11)

Pengurus rotasi tiap periode dan tidak selalu mendapat serah terima lisan, jadi konsol menjelaskan dirinya sendiri:

- **Dashboard langsung dimulai dari Perlu Tindakan.** Kartu "Mulai dari sini" (dulu `start-here.tsx` + `console-start.ts`, cookie `console_start_hidden`) dihapus pada 2026-11: kartu modul sudah menunjukkan apa yang bisa dibuka, dan panduan pindah ke pita Dokumentasi di dasar dashboard serta tombol Panduan di tiap halaman.
- **Satu sumber menu**: `src/lib/console-nav.ts` memuat daftar menu + aturan siapa yang melihatnya + `hint` (kalimat awam, tampil sebagai tooltip sidebar). Dokumentasi ada di grup Utama (selalu terlihat tanpa menggulir).
- **Akses ditolak dijelaskan**: `requireModuleAccess` dan gerbang halaman modul mengalihkan ke `/console?akses=<modul>` (atau `?akses=fitur` untuk izin fitur acara); dashboard menampilkan catatan "Akun ini belum memegang modul X, minta BPH menambahkannya". Nilai `akses` hanya dikenali kalau ada di daftar modul, tidak pernah dipantulkan mentah.
- **Judul tab per halaman**: `"<halaman> · Console PPIT Nanjing"` (template di `console/layout.tsx`).
- **Satu nama untuk rekrutmen kabinet**: *Rekrutmen* (sidebar, dashboard, judul halaman, hub Formulir). Sebelumnya "Pendaftaran", "Membership", dan "Pendaftaran Anggota" untuk modul yang sama, yang juga bentrok dengan "Pendaftar" acara dan istilah "anggota".
- **Aksesibilitas dasar konsol**: tautan "Lewati ke konten", cincin fokus keyboard bawaan (`@layer base` di `globals.css`), judul bagian (`role="heading"`) di `CollapsibleSection`, menu HP berperilaku sebagai dialog (Esc menutup), modal Panduan menutup dengan Esc, dan fokus kembali ke baris setelah aksi (Setujui/Tolak) di daftar rekaman.
- **Waktu ditampilkan dalam CST**: server Vercel berjalan di UTC, jadi tanggal/jam tanpa zona waktu eksplisit selisih 8 jam dari yang dilihat pengurus di Nanjing. Semua tampilan di `src/app/console` dan `src/components/console` kini memakai `timeZone: "Asia/Shanghai"`.
