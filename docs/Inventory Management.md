# Inventory Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md).

## Layar

| Layar | File |
|---|---|
| Borrow Requests | `borrow_requests_admin_console` |
| Inventory Audit Report | `inventory_audit_report_admin_console` |
| Guide: Inventory Control | `guide_inventory_control_admin_console` |

## Fungsi

- **Borrow Requests** — antrean persetujuan pengajuan peminjaman dari [Equipment Lending Flow](./Equipment%20Lending%20Flow.md) publik: approve/reject, tandai returned/overdue.
- **Audit Report** — riwayat perubahan stok/kondisi barang (`INVENTORY_AUDIT_LOG`) — barang ditambah, disesuaikan jumlahnya, rusak, atau dipensiunkan.

- **Daftar Barang** di `/console/inventory` — tambah barang dan edit per barang (nama, kategori, lokasi, pemegang, kondisi, jumlah, foto). Untuk mengeluarkan barang dari katalog publik, set kondisi **Dipensiunkan**, jangan dihapus (lihat [Equipment Lending Flow](./Equipment%20Lending%20Flow.md) § Aturan).

## Entitas terkait

[INVENTORY_ITEM](./Data%20Dictionary.md), [BORROW_REQUEST](./Data%20Dictionary.md), [INVENTORY_AUDIT_LOG](./Data%20Dictionary.md)
