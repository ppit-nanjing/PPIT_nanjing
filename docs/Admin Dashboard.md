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
- [Event Management](./Event%20Management.md)
- [Inventory Management](./Inventory%20Management.md)
- [Reports & Analytics](./Reports%20&%20Analytics.md)
- [Documentation & Help Center](./Documentation%20&%20Help%20Center.md)

Pola navigasi: "Slide & Push" sidebar — lihat [Motion & Animation](./Motion%20&%20Animation.md).

## Akses

Dashboard & seluruh `/admin/*` di-gate oleh role (`ROLE` bukan `member`) via middleware + Supabase RLS — lihat [Tech Stack](./Tech%20Stack.md) dan [Data Dictionary](./Data%20Dictionary.md) § ROLE/PERMISSION. Department Head kemungkinan hanya melihat data departemennya sendiri (RLS filter by `department_id`), sementara Super Admin/Admin melihat semua.
