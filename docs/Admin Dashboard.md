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

Layout `/console` hanya memeriksa "boleh masuk konsol sama sekali" (admin, koordinator divisi, atau panitia acara), jadi `src/app/console/page.tsx` menyaring sendiri. Setiap kartu angka, baris "Perlu Perhatian", pintasan "Aksi Cepat", dan sumber "Aktivitas Terbaru" milik tepat satu modul, dan query-nya hanya dijalankan kalau pemakai memegang modul itu (`hasModuleAccess()`):

| Bagian dashboard | Modul |
| --- | --- |
| Anggota | `users` |
| Sensus Lengkap | `sensus` (bukan `sensus-verify`) |
| Kegiatan, Pendaftar, aktivitas pendaftaran | `events` |
| Berita, Galeri | `content` (alias `gallery`) |
| Lowongan | `career` |
| Membership, aktivitas lamaran | `membership` |
| Inventaris | `inventory` |
| Masukan, aktivitas masukan | `feedback` |

- Pemegang `events` yang bukan full admin hanya melihat angka dan pendaftar dari acara yang bisa dibukanya: yang dia buat, yang divisinya jadi Divisi Penanggung Jawab, atau yang dia jadi panitianya (`getScopedEventIds()`, batas yang sama dengan `/console/events`). Full admin melihat semua acara.
- Pemakai tanpa satu pun modul di tabel (panitia acara, koordinator divisi, atau admin yang modulnya hanya ada di sidebar seperti `forms` atau `links`) melihat landing kecil, bukan angka lintas-modul: jalan pintas ke Kegiatan (panitia), Formulir (modul `forms`, BPH Acara/Kadiv, atau koordinator), dan Formulir Kustom di `/formulir` (siapa pun dengan `session.user.canCreateSurvey`: admin penuh, pengurus kabinet, atau panitia; aturan yang sama dengan sidebar). Landing tidak menjalankan query apa pun, termasuk panduan Help Center.
- Pengurus ranting (scope `sensus-ranting` saja) tetap dialihkan ke `/console/ranting/sensus`.
- Menambah kartu baru: daftarkan modulnya di `DASHBOARD_MODULES`, taruh subquery-nya di `fetchDashboardCounts()` di bawah `if (access.<modul>)`, dan render kartunya hanya kalau grup hitungannya ada. Jangan menambahkan angka modul lain ke query tanpa gate.
