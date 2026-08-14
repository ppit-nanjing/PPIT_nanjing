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

⚠️ Prototipe tidak memiliki layar CRUD terpisah untuk *menambah katalog barang baru* (`INVENTORY_ITEM`) di admin console — kemungkinan digabung ke dalam alur "New Entry Selection" ([lihat catatan](./Documentation%20&%20Help%20Center.md)) atau perlu ditambahkan saat build karena belum ter-cover di prototipe manapun.

## Entitas terkait

[INVENTORY_ITEM](./Data%20Dictionary.md), [BORROW_REQUEST](./Data%20Dictionary.md), [INVENTORY_AUDIT_LOG](./Data%20Dictionary.md)
