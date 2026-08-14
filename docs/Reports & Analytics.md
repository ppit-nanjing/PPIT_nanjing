# Reports & Analytics

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md).

## Layar

| Layar | File |
|---|---|
| Sensus Summary Report | `sensus_summary_report_admin_console` (contoh konten: "Oct 2023") |
| New/Refined Report Generator | `new_report_generator_admin_console`, kanonik `refined_report_generator_admin_console` |
| New Entry Selection | `new_entry_selection_admin_console` |
| Export Student Data | `export_student_data_admin_console` |

Laporan lain yang secara fungsional satu keluarga tapi diletakkan di modulnya masing-masing: [Event Attendance Report](./Event%20Management.md), [Inventory Audit Report](./Inventory%20Management.md).

## Fungsi

- **Report Generator** — UI generik untuk memilih jenis laporan + filter (rentang tanggal, departemen) lalu generate — satu UI untuk banyak `REPORT.type` (lihat [Data Dictionary](./Data%20Dictionary.md) § REPORT).
- **Sensus Summary** — agregat data [Sensus Profile](./Sensus%20Profile%20Flow.md) (jumlah mahasiswa per universitas/kota/jenjang, dsb).
- **Export Student Data** — ekspor data mahasiswa terdaftar (kemungkinan untuk pelaporan ke KBRI/Atdikbud atau organisasi nasional PPI Tiongkok).
- **New Entry Selection** — bukan laporan, tapi modal/picker pusat "buat apa?" (user baru, departemen baru, event baru, dst) — pola UI pemersatu untuk aksi create lintas modul.

## Entitas terkait

[REPORT](./Data%20Dictionary.md), data agregat dari [SENSUS_PROFILE](./Data%20Dictionary.md) dan [USER](./Data%20Dictionary.md).

## Catatan implementasi

Chart untuk laporan (Sensus Summary, Attendance, Audit) — lihat rekomendasi library di [Tech Stack](./Tech%20Stack.md).
