# Organization Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md). Modul paling banyak layarnya di seluruh admin console (10 layar) — mengelola struktur kepengurusan internal PPIT Nanjing.

## Layar

| Layar | File |
|---|---|
| Organization Management (overview) | `organization_management_admin_console` |
| Add New Department | `add_new_department_admin_console` |
| Edit Department Details | `edit_department_details_admin_console`, kanonik `edit_department_refined_design` |
| Manage Department Members & Roles | `manage_department_members_roles_admin_console` |
| Reorder Hierarchy | `reorder_hierarchy_admin_console` |
| Organizational Change Log | `organizational_change_log_admin_console` |
| Guide: Managing Regional Directories | `guide_managing_regional_directories_admin_console` |

## Fungsi

- CRUD penuh untuk struktur departemen/divisi kepengurusan (bukan direktori cabang nasional — lihat catatan skop di [Data Dictionary](./Data%20Dictionary.md)).
- **Reorder Hierarchy** — drag-and-drop untuk mengubah urutan/nesting departemen, menulis ke `DEPARTMENT.order_index` dan `parent_department_id`.
- **Manage Members & Roles** — assign anggota ke departemen + jabatan (`DEPARTMENT_MEMBER`).
- **Change Log** — audit trail tiap perubahan struktur (siapa mengubah apa, kapan) — penting untuk organisasi dengan turnover kepengurusan tahunan, supaya ada jejak transisi antar periode.

## Entitas terkait

[DEPARTMENT](./Data%20Dictionary.md), [DEPARTMENT_MEMBER](./Data%20Dictionary.md), [AUDIT_LOG](./Data%20Dictionary.md)

## Terkait publik

[Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md) (tampilan publik dari struktur yang dikelola di sini)
