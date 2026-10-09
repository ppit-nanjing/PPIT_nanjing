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
- **Akses data pendaftar** — semua panitia acara (`event.viewRegistrants`, fitur dasar) melihat daftar **ringkas**: nama, **kota asal, kampus, WeChat**, tarif, status — kota/kampus/WeChat diisi otomatis dari sensus untuk acara tanpa blok biodata (mis. Fun Hike `requiresSensus`). **Biodata lengkap + jawaban kustom + ekspor CSV** tampil untuk BPH Kabinet, Divisi Teknologi, dan **BPH Panitia acara ini** (ketua/wakil/sekretaris/SC).
- **Pertanyaan Pendaftaran** — opsional per acara: tambah pertanyaan kustom (teks pendek/panjang, dropdown, pilihan, pilih banyak) yang muncul di form publik; kosong = form standar. Jawaban tampil di Daftar Pendaftar.
- **Volunteer publik** — toggle *"Buka pendaftaran volunteer"*: orang luar PPIT melamar sendiri dari halaman acara (tanpa akun). Seksi *Pendaftar Volunteer* di konsol untuk menerima/menolak — diterima = akun undangan dibuatkan otomatis + langsung ditugaskan ke divisi pilihannya.
- **QR Check-in** — scan `EVENT_REGISTRATION.qr_code_token` di lokasi acara (`/console/events/[id]/scan`), bukan sekadar dekorasi tiket.
- **Attendance Report** — agregat kehadiran vs pendaftaran per acara, untuk evaluasi/laporan kegiatan.

### Halaman acara publik: pra- vs pasca-acara

Halaman `/events/[slug]` punya dua wajah. Pemicunya: status `completed` **atau** tanggal mulai sudah lewat (`start_at < now`) — disamakan dengan penanda "lampau" di daftar acara, supaya kartu lampau tidak lagi mendarat di halaman yang masih "Daftar Sekarang".

**Daftar publik `/events`** memuat acara berstatus `published`, `registration_closed`, dan `completed`: yang mendatang tampil seperti biasa (featured = yang terdekat), yang sudah lewat masuk section **Kegiatan Sebelumnya** sebagai kartu abu-abu "Selesai" — jadi acara tidak hilang begitu panitia menandainya selesai. Beranda memakai aturan yang sama untuk "Kegiatan Terbaru" (mendatang terdekat dulu, lalu yang paling baru selesai), dan tabel **Jangkauan** di `/catalogue/sponsorship` ikut menghitung kehadiran acara `completed`.

- **Pra-acara**: kapasitas `X / Y` + bar + sisa slot, tombol daftar, agenda di sidebar, form volunteer.
- **Pasca-acara**: bar kapasitas & tombol daftar hilang, diganti "Acara ini sudah selesai."; agenda sidebar disembunyikan (timeline di kolom kiri tetap sebagai arsip); muncul bagian **Dokumentasi & Materi**; dan kotak **Isi Evaluasi** menuju kuesioner pasca-acara.

Yang diisi panitia lewat form Edit acara → seksi **"4 · Setelah Acara"** (scope `events`, jadi humas bisa mengisi):

- **Jumlah Hadir (Final)** (`events.final_attendee_count`) — diketik manual, bukan dari check-in QR (acara Zoom/webinar sering tanpa pendaftaran portal). Kosong = halaman tetap memakai angka terdaftar.
- **Rincian Kehadiran** (`events.attendance_note`) — teks bebas mis. "80 online · 40 offline".
- **Link Video Recap / Rekaman** (`events.recap_video_url`) — tombol keluar "Tonton Recap", tidak di-embed (CSP + audiens daratan Tiongkok).
- **Album Dokumentasi** — memilih di sini mengisi `gallery_albums.event_id`. Foto highlight album tampil di halaman acara + tautan album lengkap + tombol "Unduh Semua Foto" (drive album). Foto tetap diunggah tim konten di Konten › Galeri.

### Evaluasi acara (pasca-acara)

Kuesioner pasca-acara untuk peserta di `/events/[slug]/evaluasi` — publik, **tanpa akun**, identitas opsional + toggle anonim, satu perangkat satu respons (token + unique `(event_id, responder_token)`). Tombol "Isi Evaluasi" muncul di halaman acara begitu acaranya lewat (`isPast`); detail alur di [Evaluasi Acara](./Evaluasi%20Acara.md).

- **Pertanyaan otomatis per acara**: template WIF (slug berawalan `wif`, termasuk sesi CGT) vs template umum (Registrasi, Fasilitas, Sesi & Materi, Acara & Panitia). Resolver di `src/lib/event-evaluation-template.ts` — tidak ada konfigurasi per acara di console; menambah template baru = tambah objek di file itu.
- **Rekap di console**: section *Evaluasi Acara* di `/console/events/[id]` — ringkasan (jumlah respons, rata-rata, anonim) + tiga tab: **Grafik** (rata-rata & distribusi 1–10 tiap rating), **Jawaban** (preview per pertanyaan: distribusi nilai + semua jawaban teks), **Respons** (per orang + hapus respons spam). Ekspor **CSV / Excel** (kolom mengikuti template).
- **Distribusi tautan**: tombol di halaman acara + short link/QR dari modul Tautan. Tidak ada flag buka/tutup — panitia berhenti membagikan tautannya saat periode evaluasi selesai.

### Kepanitiaan per-acara

Susunan panitia **dibentuk ulang untuk setiap acara** — jabatan dan divisi tidak mewarisi struktur kabinet, karena bendahara sebuah acara belum tentu bendahara kabinet, dan seseorang bisa memegang jabatan besar di satu acara tanpa jabatan struktural apa pun di kepengurusan.

- **Divisi per acara** bernama teks bebas (bukan enum — tiap acara boleh punya susunan sendiri), boleh bertingkat (mis. *Perlengkapan* menaungi *Konsumsi*, *Sound System*), lengkap dengan target jumlah orang dan jobdesk-nya — jobdesk yang biasanya mati di slide PowerPoint ikut hidup di portal.
- Anggota ditugaskan per orang dengan **peran di dalam divisinya**; gabungan peran + nama divisi membentuk sebutan lengkapnya ("ketua" + divisi "Perlengkapan" = Ketua Departemen Perlengkapan). Untuk mempercepat: anggota bisa **dicentang banyak sekaligus** lewat daftar yang bisa dicari (+ Tambah Anggota), dan ketua departemen ditetapkan satu klik dari kartu divisinya.
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

Aturan bawaannya **semua peserta dapat e-certificate**: tiap acara punya checkbox "Peserta mendapat e-sertifikat kehadiran" (nyala secara default) — cukup dimatikan untuk acara tanpa sertifikat partisipasi. Dua aturan baru (2026-10-07): **tidak ada sertifikat tanpa tautan berkas https://**, dan **sertifikat peserta hanya untuk yang kehadirannya tercatat** (`attended`, QR sudah di-scan). Aturan lengkap + kode ada di [Event Flow](./Event%20Flow.md) § Setelah acara.

- **Penerbitan tidak lagi otomatis** saat acara ditandai `completed`: tautannya per orang, jadi dibuat manual dari console acara — section **Sertifikat Peserta** / **Sertifikat Panitia** (kapabilitas `event.issueCertificates`): tiap baris punya kolom tautan + tombol Terbitkan, plus **Tempel banyak sekaligus** (satu orang per baris: `email atau nama lengkap` + tautan; server melaporkan baris yang tidak cocok/ganda/bukan yang berhak), dan **Folder sertifikat**: simpan satu tautan folder lalu "Terbitkan semua yang berhak" memasangnya ke seluruh daftar sekaligus (yang sudah punya tautan diperbarui tanpa notifikasi ulang).
- Menyimpan tautan lain pada sertifikat yang sudah terbit hanya **memperbarui tautannya** — tanggal terbit tidak berubah dan tidak ada notifikasi kedua.
- **Sertifikat panitia** untuk semua anggota kepanitiaan acara itu; judulnya dirakit dari peran + divisi + acara (`src/lib/certificate-title.ts`).
- Jenis: `peserta`, `panitia`, `pemateri`, `lainnya`; sertifikat juara dicatat lewat judul bebas (mis. "Juara 1 Lomba …"). Sertifikat lepas (pemateri/juara) lewat **Work Ledger → Sertifikat** — tautan juga wajib di sana.
- Sertifikat **tanpa berkas** (sisa aturan lama) tetap tersimpan tapi tidak tampil di profil dan tidak dihitung terbit; menempel tautan padanya membuatnya terbit (tanpa notifikasi ulang).
- Setelah punya tautan, sertifikat tampil di **profil user** (E-Sertifikat) + notifikasi "E-sertifikat sudah terbit" dikirim saat dibuat.

## Entitas terkait

[EVENT](./Data%20Dictionary.md), [EVENT_REGISTRATION](./Data%20Dictionary.md), [EVENT_DIVISION](./Data%20Dictionary.md), [EVENT_COMMITTEE](./Data%20Dictionary.md), [EVENT_EVALUATION](./Data%20Dictionary.md), [CERTIFICATE](./Data%20Dictionary.md)

## Terkait publik

[Event Flow](./Event%20Flow.md) — semua data yang dikelola di sini langsung tampil di listing/detail event publik, halaman tiket peserta, dan profil user.
