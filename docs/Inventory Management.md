# Inventory Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md). Alur peminjaman: [Equipment Lending Flow](./Equipment%20Lending%20Flow.md).

## Layar `/console/inventory`

Tata letaknya mengikuti konsol Kegiatan (`/console/events`):

1. **Kepala halaman** — judul, Panduan, Log Audit, dan tombol **Tambah Barang** yang membuka form di bawah judul (`EventsPageHeader` dengan `createLabel`).
2. **Ringkasan angka** — Barang aktif (dan jumlah Pensiun), Unit tersedia dari barang aktif, Sedang dipinjam (pengajuan Disetujui/Dipinjam/Terlambat + pinjam keluar; jumlah terlambat disorot), Perlu tindakan (pengajuan menunggu + minta kembali + usulan Nanjinger).
3. **Tab** (`ConsoleTabPanel`, sama dengan Panel Admin acara; bagian aktif di `?bagian=`). Tab bawaan: Peminjaman bila ada antrean, lalu Usulan, selain itu Barang.

| Tab (`?bagian=`) | Isi |
|---|---|
| Peminjaman (`peminjaman`) | Antrean pengajuan dengan saringan Perlu Tindakan / Sedang Dipinjam / Selesai / Semua + cari. Per baris: setujui/tolak, serahkan, tandai kembali, dan **Koreksi status…** untuk salah klik. |
| Barang (`barang`) | Daftar ringkas (foto, kategori, lokasi, pemegang, stok, kondisi) dengan saringan Aktif / Pensiun / Semua, kategori, dan cari. Edit terbuka di baris itu (hanya satu form dirender). |
| Pinjam Keluar (`keluar`) | Aset yang sedang di pihak luar (tandai kembali) dan form catat peminjaman keluar. |
| Reservasi (`reservasi`) | Blokir aset untuk periode acara. |
| Usulan Nanjinger (`usulan`) | Sumbangan/pinjaman barang dari Nanjinger dan usulan pengadaan. |

`/console/inventory/audit-log` — riwayat perubahan stok/kondisi barang (`inventory_audit_logs`).

## Aturan

- Untuk mengeluarkan barang dari katalog publik, ubah kondisinya jadi **Pensiun** (`retired`), jangan dihapus — menghapus ikut menghapus riwayat peminjamannya. Barang Pensiun tidak bisa dipilih untuk pinjam keluar, reservasi, atau penggabungan sumbangan.
- Aturan stok, koreksi status, dan sinkron dengan sheet ASET Logistik: lihat [Equipment Lending Flow](./Equipment%20Lending%20Flow.md) § Aturan.

## Entitas terkait

[INVENTORY_ITEM](./Data%20Dictionary.md), [BORROW_REQUEST](./Data%20Dictionary.md), [INVENTORY_AUDIT_LOG](./Data%20Dictionary.md)
