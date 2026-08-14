# Join Us Flow

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## Layar

- **Join Us** (`join_us_ppit_nanjing`) — form pendaftaran calon anggota/pengurus baru, aktif saat periode rekrutmen dibuka.
- **Join Us — Closed State** (`join_us_closed_state_ppit_nanjing`) — tampilan alternatif saat periode rekrutmen ditutup (menampilkan info "buka lagi kapan" alih-alih form).

Dua layar ini adalah **satu rute dengan dua state**, dikontrol oleh field `RECRUITMENT_PERIOD.is_open` (lihat [Data Dictionary](./Data%20Dictionary.md)) — bukan dua halaman terpisah secara arsitektur.

## Entitas terkait

[RECRUITMENT_PERIOD](./Data%20Dictionary.md), [MEMBERSHIP_APPLICATION](./Data%20Dictionary.md)

## Alur setelah submit

Form Join Us disubmit → `MEMBERSHIP_APPLICATION` status `pending` → admin review lewat [User & Role Management](./User%20&%20Role%20Management.md) → diterima → otomatis dibuatkan `USER` baru (atau di-link ke akun yang sudah ada bila pendaftar sudah login sebelumnya).

## Catatan implementasi

Buka/tutup periode rekrutmen sebaiknya jadi **toggle admin**, bukan hardcode tanggal di frontend — supaya pengurus (yang berganti tiap tahun akademik) bisa mengatur sendiri tanpa perlu deploy ulang.
