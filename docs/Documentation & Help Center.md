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

## Chatbot Help Center: jawaban hanya dari artikel publik

Widget di `src/components/ai/help-center.tsx` (dipasang global di `src/app/layout.tsx`, tab chat hanya untuk yang login) sekarang **tidak menjawab dari pengetahuan umum model**. Alurnya:

1. `chatWithAIAction` (`src/app/actions/ai.ts`) mengambil pertanyaan terakhir.
2. `findGuideChunks` (`src/lib/guidebook-search.ts`) mencari artikel bantuan dengan **`is_public = true`** saja — pencarian leksikal: potongan kata kunci lewat `ILIKE` (kata asli + bentuk tanpa imbuhan, kata fungsi/sapaan dibuang), lalu skor di JS (judul ×4, bagian ×2, isi maks 3). Tanpa embedding: korpusnya masih puluhan artikel, jadi pencarian vektor hanya menambah vendor dan satu titik gagal baru.
3. Potongan teratas (maks 4 artikel, ±7.000 karakter) masuk ke system prompt sebagai **satu-satunya sumber**; model dilarang menambah fakta, angka, biaya, atau tenggat dari luar sumber, dan diminta menyebut judul panduannya. Tidak ada yang cocok → model menjawab belum ada panduannya dan mengarahkan ke pengurus.

Konsekuensi untuk pengurus:

- **Artikel yang belum ditandai "Tampilkan di halaman publik" tidak akan pernah dipakai chatbot.** Itu disengaja: SOP console (isi internal) tidak boleh bocor ke jawaban anggota.
- Menambah panduan baru = tulis artikel di `/console/docs` + nyalakan toggle publik. Tanpa deploy. Guidebook maba (issue #65) memakai jalur yang sama — rencananya di [Guidebook Maba](./Guidebook%20Maba.md).

SOP singkat untuk artikel Help Center pengurus (buat di `/console/docs/new`, nyalakan tampilkan di halaman publik):

> **Chatbot cuma bisa menjawab dari panduan yang sudah terbit.** Kalau chatbot bilang "belum ada panduannya", artinya belum ada artikel publik yang cocok — bukan chatbotnya rusak. Tulis/paskan panduannya di Dokumentasi & Bantuan, nyalakan "Tampilkan di halaman publik", lalu coba tanya lagi. Untuk topik visa, izin tinggal, biaya, dan tenggat, jawaban pengurus wajib ditinjau dulu sebelum diterbitkan: chatbot akan mengutip artikel itu apa adanya.
