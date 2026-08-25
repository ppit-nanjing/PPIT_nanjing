# Event Management

> Bagian dari [Admin Dashboard](./Admin%20Dashboard.md).

## Layar

| Layar | File / route |
|---|---|
| Event Management (listing) | `event_management_admin_console` |
| Create New Event | `create_new_event_admin_console` |
| Edit Event Details | `edit_event_details_admin_console` → `/console/events/[id]` |
| Manage Registrations | `manage_registrations_admin_console` |
| Event Attendance Report | `event_attendance_report_admin_console` |
| Guide: Event Coordination & QR Check-in | `guide_event_management_admin_console` |
| Work Ledger — kepanitiaan, verifikasi pembayaran & sertifikat lintas-acara | `/console/work-ledger` |

## Fungsi

### CRUD & siklus hidup acara

- CRUD event penuh (`draft` → `published` → `registration_closed` → `completed`).
- Publikasi terjadwal: acara disiapkan penuh lebih dulu, lalu otomatis tayang pada waktu yang ditentukan (`scheduled_publish_at`).
- **Manage Registrations** — lihat & kelola pendaftar, ubah status (`pending`/`confirmed`/`cancelled`), lakukan check-in manual.
- **QR Check-in** — scan `EVENT_REGISTRATION.qr_code_token` di lokasi acara (`/console/events/[id]/scan`), bukan sekadar dekorasi tiket.
- **Attendance Report** — agregat kehadiran vs pendaftaran per acara, untuk evaluasi/laporan kegiatan.

### Kepanitiaan per-acara

Susunan panitia **dibentuk ulang untuk setiap acara** — jabatan dan divisi tidak mewarisi struktur kabinet, karena bendahara sebuah acara belum tentu bendahara kabinet, dan seseorang bisa memegang jabatan besar di satu acara tanpa jabatan struktural apa pun di kepengurusan.

- **Divisi per acara** bernama teks bebas (bukan enum — tiap acara boleh punya susunan sendiri), boleh bertingkat (mis. *Perlengkapan* menaungi *Konsumsi*, *Sound System*), lengkap dengan target jumlah orang dan jobdesk-nya — jobdesk yang biasanya mati di slide PowerPoint ikut hidup di portal.
- Anggota ditugaskan per orang dengan **peran di dalam divisinya**; gabungan peran + nama divisi membentuk sebutan lengkapnya ("ketua" + divisi "Perlengkapan" = Ketua Departemen Perlengkapan).
- Sumber anggota fleksibel: pengurus PPIT sesuai divisinya, atau **volunteer dari dalam maupun luar PPIT** bila kekurangan orang. Volunteer eksternal cukup di-invite menjadi akun lewat undangan massal di [User & Role Management](./User%20&%20Role%20Management.md) sebelum bisa ditugaskan.
- **Beban kepanitiaan lintas-acara** dipantau di Work Ledger: orang yang sudah kepanitia di ≥3 acara ditandai (pengingat, bukan larangan).

### HTM — pembayaran manual, diverifikasi bendahara

- HTM bersifat opsional per acara. Nominal sering baru pasti belakangan (menunggu kepastian sponsor), maka penanda "acara berbayar" dipisahkan dari nominalnya — nominal boleh menyusul kemudian.
- **Tanpa payment gateway** (Alipay/WeChat Pay mensyaratkan badan hukum Tiongkok): peserta mentransfer sendiri, lalu **mengirim bukti transfer ke web** dari halaman tiketnya.
- Pembayaran **perorangan** — satu pendaftaran satu tanggungan bayar; tidak ada pembayaran berkelompok.
- Verifikasi manual oleh bendahara acara: bukti masuk → `verified`/`rejected`, tercatat siapa & kapan memverifikasi. Work Ledger hanyalah penunjuk lintas-acara "di mana perhatian dibutuhkan"; verifikasi sesungguhnya terjadi di halaman acara masing-masing (konteks biaya + catatan tersedia di sana). ⚠️ Bagian verifikasi di-gate scope admin **Organisasi** (data finansial) — bendahara acara harus memegang scope itu, scope `events` saja tidak cukup untuk melihat/memverifikasi.
- Opsional: deep-link Alipay yang pre-fill nominal + memo, supaya peserta tidak salah ketik — tetap 100% verifikasi manual.

### Sponsorship

Sponsor dikelola sebagai direktori bertingkat (Platinum / Gold / Silver / Mitra) dengan logo & tautan, ditampilkan publik di `/catalogue/sponsorship`. Sponsorship adalah pertimbangan utama penetapan HTM — itulah alasan nominal biaya sengaja boleh mengikuti hasil negosiasi sponsor.

### Sertifikat

Aturan bawaannya **semua peserta dapat e-certificate**: tiap acara punya checkbox "Peserta mendapat e-sertifikat kehadiran" (nyala secara default) — cukup dimatikan untuk acara tanpa sertifikat partisipasi.

- **Terbitkan Sertifikat Peserta** (halaman acara di konsol) menerbitkan sekaligus untuk semua pendaftar yang diterima (`confirmed`/`attended`) — hanya untuk yang belum punya, jadi aman ditekan ulang setelah ada pendaftar baru.
- Di luar sertifikat kehadiran itu, keputusan tambahan tetap milik panitia per acara lewat Work Ledger: sertifikat juara/pemenang, panitia per divisi, atau pemateri.
- Jenis: `peserta`, `panitia`, `pemateri`, `lainnya`; sertifikat juara dicatat lewat judul bebas (mis. "Juara 1 Lomba …").
- File dibuat/diunggah di luar aplikasi (boleh tautan Google Drive); aplikasi mencatat pemilik, jenis, acara, dan penerbitnya. Tautan berkas bisa diisi/diganti belakangan langsung dari daftar sertifikat di Work Ledger.
- Setelah diterbitkan, sertifikat tampil di **profil user** (bagian E-Sertifikat) — lihat [Event Flow](./Event%20Flow.md) § Setelah acara.

## Entitas terkait

[EVENT](./Data%20Dictionary.md), [EVENT_REGISTRATION](./Data%20Dictionary.md), [EVENT_DIVISION](./Data%20Dictionary.md), [EVENT_COMMITTEE](./Data%20Dictionary.md), [CERTIFICATE](./Data%20Dictionary.md)

## Terkait publik

[Event Flow](./Event%20Flow.md) — semua data yang dikelola di sini langsung tampil di listing/detail event publik, halaman tiket peserta, dan profil user.
