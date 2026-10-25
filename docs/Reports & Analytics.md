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

## Zona waktu di file ekspor

Semua ekspor Excel dan CSV di konsol (evaluasi, pendaftar, Oprek, sensus, laporan, donasi, membership, pengguna) memakai **jam Tiongkok (CST, UTC+8)**. Dulu jamnya UTC karena fungsi Vercel berjalan di UTC: file yang diunduh dari produksi sebelum 2026-10-25 menampilkan jam 8 jam lebih awal dari jam Tiongkok (tambah 8 jam untuk jam Tiongkok, 7 jam untuk WIB).

- Kepala kolom waktu membawa zonanya, mis. `Waktu (jam Tiongkok CST, UTC+8)`, dan baris "Dicetak:" di atas XLSX juga. Excel tidak punya zona waktu, jadi label inilah satu-satunya petunjuk bagi pembaca file.
- XLSX: ExcelJS menyimpan tanggal sebagai serial berbasis UTC, jadi `datasetToXlsx` menggeser +8 jam lewat `toChinaWallClock` sebelum menulis sel. CSV: `Intl.DateTimeFormat` dikunci ke `Asia/Shanghai`.
- Pendaftar dan donasi (CSV buatan sendiri) memakai `formatChinaDateTimeIso` (`2026-10-25 16:10`); nama file memakai `formatChinaDateIso`. Semua helper ada di `src/lib/datetime.ts`.
- Kolom tanggal tanpa jam (tanggal lahir, masa berlaku paspor) bertipe teks `date` dari database dan tidak digeser.
- Kolom bertipe `date` di `ReportColumn` selalu dianggap waktu (instant) dan otomatis diberi label zona. Kalau suatu hari butuh kolom tanggal murni, buat tipe baru, jangan pakai `date`.
