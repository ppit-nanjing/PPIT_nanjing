# Event Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md).

## Layar

| Layar | File |
|---|---|
| Event Management (listing) | `event_management_admin_console` |
| Create New Event | `create_new_event_admin_console` |
| Edit Event Details | `edit_event_details_admin_console` |
| Manage Registrations | `manage_registrations_admin_console` |
| Event Attendance Report | `event_attendance_report_admin_console` |
| Guide: Event Coordination & QR Check-in | `guide_event_management_admin_console` |

## Fungsi

- CRUD event penuh (draft → published → registration_closed → completed).
- **Manage Registrations** — lihat & kelola siapa saja yang mendaftar, ubah status (`pending`/`confirmed`/`cancelled`), lakukan check-in manual.
- **QR Check-in** (disebut eksplisit di judul dokumentasi guide) — mengonfirmasi `EVENT_REGISTRATION.qr_code_token` dipakai untuk scan check-in di lokasi acara, bukan cuma dekorasi tiket.
- **Attendance Report** — agregat kehadiran vs pendaftaran per event, untuk evaluasi/laporan kegiatan.

## Entitas terkait

[EVENT](./Data%20Dictionary.md), [EVENT_REGISTRATION](./Data%20Dictionary.md)

## Terkait publik

[Event Flow](./Event%20Flow.md) — semua data yang dikelola di sini langsung tampil di listing/detail event publik.
