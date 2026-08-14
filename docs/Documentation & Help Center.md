# Documentation & Help Center

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md). Modul unik — pusat dokumentasi **di dalam produk** untuk pengurus admin, bukan wiki eksternal.

## Layar

| Layar | File |
|---|---|
| Documentation Hub (index) | `documentation_hub_admin_console` |
| Help & Documentation | `help_documentation_admin_console` |
| Full Changelog (System) | `full_changelog_admin_console` |
| Guide: User Management | `guide_user_management_admin_console` |
| Guide: User Roles & Permissions | `guide_updated_user_roles_permissions` |
| Guide: Event Management & QR Check-in | `guide_event_management_admin_console` |
| Guide: Inventory Control | `guide_inventory_control_admin_console` |
| Guide: Managing Regional Directories | `guide_managing_regional_directories_admin_console` |
| Guide: Configuring Notification Templates | `guide_configuring_notification_templates_admin_console` |

**7 halaman *Guide*** (satu per modul admin) + hub + changelog = **9 layar**, modul terbesar kedua setelah Organization Management. Ini sinyal kuat bahwa tim produk sadar organisasi mahasiswa punya **turnover kepengurusan tinggi** (bergonta-ganti tiap periode/tahun akademik) — dokumentasi in-app jadi kebutuhan nyata, bukan nice-to-have.

## Fungsi

- **Documentation Hub** — indeks semua guide, dikelompokkan per modul.
- **Full Changelog** — catatan rilis fitur produk (bukan audit log data — lihat perbedaannya di [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md) § Keputusan Desain Data).
- **Configuring Notification Templates** — admin bisa mengubah isi template notifikasi (konfirmasi event, approval peminjaman, dst) tanpa perlu developer — lihat [NOTIFICATION_TEMPLATE](./Data%20Dictionary.md).

## Entitas terkait

[HELP_ARTICLE](./Data%20Dictionary.md), [RELEASE_NOTE](./Data%20Dictionary.md), [NOTIFICATION_TEMPLATE](./Data%20Dictionary.md)

## Rekomendasi

Jadikan `HELP_ARTICLE` **editable oleh Super Admin lewat UI** (bukan hardcode di kode aplikasi) — konsisten dengan alasan modul ini ada: supaya pengurus baru bisa mewariskan/memperbarui panduan tanpa bergantung developer.
