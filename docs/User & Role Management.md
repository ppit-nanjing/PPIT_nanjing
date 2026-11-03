# User & Role Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md).

## Layar

| Layar | File |
|---|---|
| User Management (tabel/daftar) | `user_management_admin_console` |
| Add New User | `add_new_user_admin_console` |
| Guide: User Management | `guide_user_management_admin_console` |
| Guide: User Roles & Permissions | `guide_user_role_permissions_admin_console`, kanonik `guide_updated_user_roles_permissions` |

## Fungsi

- Tabel semua member terdaftar — filter by role/departemen/status, aksi per-baris (edit, nonaktifkan, ubah role). **Ganti divisi atau status hanya mengajukan perubahan**: baris menandai pilihan baru dan menampilkan "Belum diterapkan" dengan ringkasan; baru tersimpan setelah *Terapkan* (menonaktifkan/menangguhkan meminta konfirmasi tambahan). Sebelumnya setiap perubahan `<select>` langsung tersimpan, sehingga satu tekan panah mengganti divisi dan menghapus jabatan kepala unit.
- Tambah user manual oleh admin (di luar alur self-register [Join Us](./Join%20Us%20Flow.md)) — untuk kasus seperti input pengurus baru langsung.
- Dua halaman *Guide* menunjukkan role & permission cukup kompleks untuk butuh dokumentasi in-app — konsisten dengan model [ROLE](./Data%20Dictionary.md)/[PERMISSION](./Data%20Dictionary.md) granular (bukan sekadar 2-3 role datar).

## Entitas terkait

[USER](./Data%20Dictionary.md), [ROLE](./Data%20Dictionary.md), [PERMISSION](./Data%20Dictionary.md)

## Terkait

[Reports & Analytics](./Reports%20&%20Analytics.md) § Export Student Data (export data user/sensus untuk keperluan pelaporan eksternal)
