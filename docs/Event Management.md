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

## Tampilan konsol (2026-11)

**Daftar `/console/events`** sengaja mengikuti `/events`: acara terdekat tampil besar, sisanya kartu bersampul, kegiatan lampau abu-abu. Tambahan khusus panitia: kelompok **Menunggu Persetujuan BPH** (paling atas, hanya kalau ada isinya) dan **Sedang Disiapkan** (draf + terjadwal, belum tampil di publik; yang sudah disetujui lebih dulu), jumlah terdaftar dan bilah kuota, saringan per kelompok + pencarian, serta menu `⋯` per acara (buka halaman publik, jadikan draf, pindahkan ke Sampah). Sedang Disiapkan dan Sudah Lewat dipotong 6 kartu dengan tombol Tampilkan Semua, supaya draf percobaan tidak menenggelamkan yang lain. Kelompok dihitung dari `eventStage()` di `src/lib/event-stage.ts`, bukan langsung dari `events.status`: acara `published` yang tanggalnya sudah lewat masuk **Sudah Lewat**.

**Detail `/console/events/[id]`** punya dua lapis:

- **Kepala** (`event-console-header.tsx`): cermin kepala halaman publik (sampul, judul, tanggal, lokasi), lalu angka terdaftar, hadir, panitia, dan antrean keputusan, lalu lima tahap acara (Persiapan, Tayang, Berlangsung, Pasca-Acara, Terkunci) beserta tanggalnya. Tombol Scanner Check-in selalu di layar pertama.
- **Panel Admin** (`event-admin-panel.tsx`) dengan tiga tab. Isi tiap bagian tidak berubah; hanya tempatnya:
  - **Publik**: Status & Publikasi, Info & Pengaturan Acara, Deskripsi & Agenda, Pertanyaan Pendaftaran, Kategori Tarif, Tautan Pendaftaran & Evaluasi.
  - **Internal**: Verifikasi Pembayaran, Pendaftar Volunteer, Daftar Pendaftar, Struktur Kepanitiaan, Reservasi Aset, Divisi Penanggung Jawab, Riwayat Audit.
  - **Pasca-Acara**: Setelah Acara, Galeri Foto, Artikel Berita, Sertifikat Peserta & Panitia, Evaluasi Acara, Pertanyaan Evaluasi, Kredit / Arsip.

Tab yang terbuka mengikuti tahap acara: Persiapan membuka Publik; Tayang dan Berlangsung membuka Internal; setelah itu Pasca-Acara. Kalau ada pembayaran atau volunteer menunggu keputusan, Internal didahulukan (kecuali saat Persiapan). Tab tersimpan di `?bagian=publik|internal|pasca`, jadi bisa dibagikan dan bertahan saat di-refresh. Isi semua tab tetap dirender server dengan gerbang `can()` yang sama; tab hanya mengatur yang terlihat, **bukan** batas akses. Menambah bagian baru: taruh di kelompok yang sesuai di `page.tsx`, dan isi `description`-nya dengan keadaan terkini (mis. "3 pertanyaan"), bukan penjelasan fungsi.

## Fungsi

### Persetujuan acara oleh BPH Kabinet (2026-11)

Siapa pun di kabinet boleh menuangkan ide acara, tapi baru bisa tampil ke publik setelah disetujui BPH Kabinet. Alurnya: **buat draf → ajukan ke BPH → BPH setujui atau tolak → pembuat atau BPH Panitia menerbitkan atau menjadwalkan.** Menyetujui belum menerbitkan.

- **Siapa yang boleh membuat**: `session.user.canCreateEvent`, yaitu pengurus kabinet (punya baris `department_members`, status `active`, bukan role ranting) atau full admin yang aktif. Flag ini juga membuka pintu `/console` dan menu Kegiatan. Karena dihitung ulang dari database di setiap sesi, orang yang keluar dari kabinet langsung kehilangan haknya.
- **Hak pembuat** (`creatorHasCapability` di `src/lib/event-capabilities.ts`): sebelum disetujui hanya `CREATOR_DRAFT_CAPABILITIES` (isi acara, pertanyaan, tarif, dan mengajukan), supaya draf percobaan tidak membuka data orang lain. Setelah disetujui ditambah fitur dasar panitia (`BASIC_CAPABILITIES`). `event.manageCommittee` tidak pernah ikut, karena jabatan BPH Panitia membuka biodata lengkap pendaftar dan pembuat tidak boleh mengangkat dirinya sendiri: Ketua Pelaksana ditunjuk BPH Kabinet di Struktur Kepanitiaan. Pembuat juga boleh membuang drafnya sendiri selama belum disetujui (`canDeleteOwnDraft`); BPH Kabinet tetap bisa memulihkannya dari Sampah. Hak ini hanya berlaku untuk draf yang belum disetujui atau acara yang disetujui lewat alur ini (`grantsCreatorRights`). Acara lama (`approved_by` kosong) dan acara batal tidak memberinya, supaya orang yang sudah kehilangan modul Kegiatan tidak mendapat lagi akses ke acara lamanya.
- **Yang digerbang** (`EventAccess.canRelease`, ditegakkan di server): `setEventStatus` untuk semua perubahan status selain buka/tutup pendaftaran. Status batal ikut ditahan karena halaman publik acara batal tetap bisa dibuka lewat tautan. `updateEventInfo` untuk jadwal rilis (nilai kiriman diabaikan bila belum boleh), dan `createEvent` (jadwal hanya untuk full admin).
- **Yang menunggu persetujuan juga**: tautan pendek acara (`ensureEventShortLinks`), karena judulnya langsung tampil di direktori publik `/l`, dan Oprek BPH atas acara buatan sendiri (`getCoordinatorEventIds`), karena penempatannya bisa mengangkat Ketua. Pengurus tanpa modul Kegiatan juga tidak bisa menandai Divisi Penanggung Jawab saat membuat acara, supaya jalan Oprek BPH lewat baris PJ tertutup.
- **BPH Kabinet**: acara buatannya otomatis disetujui. Kalau menerbitkan atau menjadwalkan draf yang belum pernah diajukan, itu sekaligus persetujuannya. Selama ada pengajuan yang menunggu, `canRelease` menutup jalan itu juga untuk BPH: keputusan harus lewat panel Setujui/Tolak supaya pengajunya mendapat kabar.
- **Persetujuan berlaku untuk idenya, bukan untuk isi akhir**: setelah disetujui, pembuat masih bisa mengubah isi acara, dan menerbitkan tidak butuh persetujuan ulang. Ini keputusan alur, bukan celah.
- **Mengajukan** (`requestEventApproval`, butuh `event.publish`): semua pengguna `users.status = 'active'` dengan role `access_tier = 'full'` mendapat notifikasi `event_approval_requested`. Divisi Teknologi boleh memutuskan tetapi tidak ikut dikabari, karena bukan pemilik keputusan ini. Kalau tidak ada yang membaca notifikasinya, antrean tetap terlihat di daftar Kegiatan dan di baris "Acara menunggu persetujuan BPH" pada dashboard.
- **Memutuskan** (`reviewEventApproval`, butuh `event.approve`, khusus full admin): menolak wajib beralasan. Alasannya dikirim ke pengaju (`event_approval_rejected`), tercatat di Riwayat Audit, dan tampil di panel selama acara belum diajukan lagi. Pengajuan yang ditolak kembali ke draf biasa, boleh diperbaiki lalu diajukan lagi.
- **Data**: `approval_requested_at/by`, `approved_at/by` di `events` (migrasi `drizzle/0059_event_approval.sql`). Migrasi itu menandai acara yang sudah tampil atau terjadwal sebagai disetujui. Draf lama tetap belum disetujui, jadi pemegang modul Kegiatan perlu mengajukannya, atau BPH Kabinet menerbitkannya langsung. Acara yang dibatalkan hanya bisa diaktifkan lagi oleh BPH Kabinet.
- **Tampilan**: `eventStatusChip` dan `eventPreparationNote` di `src/lib/event-stage.ts`; panel di `src/components/console/event-approval-panel.tsx`, di bagian Status & Publikasi. Aturan murninya diperiksa `npm run check:event-approval`.

Di dashboard, "Kegiatan masih draf" untuk full admin hanya menghitung draf yang sudah disetujui, supaya draf percobaan bukan pekerjaan BPH sampai diajukan.

### CRUD & siklus hidup acara

- CRUD event penuh (`draft` → `published` → `registration_closed` → `completed`).
- Publikasi terjadwal: acara disiapkan penuh lebih dulu, lalu otomatis tayang pada waktu yang ditentukan (`scheduled_publish_at`).
- **Manage Registrations** — lihat & kelola pendaftar, ubah status (`pending`/`confirmed`/`cancelled`), lakukan check-in manual.
- **Akses data pendaftar** — semua panitia acara (`event.viewRegistrants`, fitur dasar) melihat daftar **ringkas**: nama, **kota asal, kampus, WeChat**, tarif, status — kota/kampus/WeChat diisi otomatis dari sensus untuk acara tanpa blok biodata (mis. Fun Hike `requiresSensus`). **Biodata lengkap + jawaban kustom + ekspor CSV** tampil untuk BPH Kabinet, Divisi Teknologi, dan **BPH Panitia acara ini** (ketua/wakil/sekretaris/SC). Email dan jawaban kustom juga tidak dikirim ke browser untuk versi ringkas. Tombol **Daftar / Tabel** di atas daftar membuka tampilan tabel ([Tampilan Tabel Konsol](./Tampilan%20Tabel%20Konsol.md)).
- **Pertanyaan Pendaftaran** — opsional per acara: tambah pertanyaan kustom (teks pendek/panjang, dropdown, pilihan, pilih banyak) yang muncul di form publik; kosong = form standar. Jawaban tampil di Daftar Pendaftar.
- **Divisi Penanggung Jawab (per acara, boleh >1)** — `event_responsible_departments`; diisi dari form Buat Acara atau section di `/console/events/[id]`. Efeknya: anggota divisi itu otomatis **melihat & mengelola acara tsb** di menu Kegiatan — **selama divisinya memegang centang "Kegiatan" di Organisasi** (baris PJ menyempitkan akses pemegang modul ke acara divisinya, bukan memberi modul baru). Hanya full admin (BPH Kabinet + Divisi Teknologi) yang boleh mengubah field ini.
- **Akses modul "Kegiatan" kini spesifik per acara** (`getEventAccess` di `src/lib/event-access.ts`): pemegang scope `events` non-full hanya tembus acara yang **dia buat** ∪ **divisinya jadi Divisi PJ** ∪ acara tempat dia panitia. Acara tanpa PJ = full admin + pembuatnya. Work Ledger ikut dibatasi (`getScopedEventIds`). `EVENT_RBAC_STRICT=true` mematikan jembatan modul sepenuhnya (hanya full admin + panitia acara).
- **Volunteer publik** — toggle *"Buka pendaftaran volunteer"*: orang luar PPIT melamar sendiri dari halaman acara (tanpa akun). Seksi *Pendaftar Volunteer* di konsol untuk menerima/menolak — diterima = akun undangan dibuatkan otomatis + langsung ditugaskan ke divisi pilihannya.
- **QR Check-in** — scan `EVENT_REGISTRATION.qr_code_token` di lokasi acara (`/events/[slug]/scan`, bisa dibuka panitia dengan hak scan walau bukan admin kabinet), bukan sekadar dekorasi tiket. Pengaman di pintu (2026-11):
  - Jumlah hadir dan terdaftar ada di bagian ATAS halaman, bukan di dasar.
  - Check-in manual (cari nama) menampilkan status peserta *sebelum* diketuk: yang belum lunas / dibatalkan tidak punya tombol Check-in, diganti label dan petunjuk (`CHECK_IN_BLOCK_DOOR_MESSAGE` di `src/lib/event-checkin.ts`). Hasil check-in (berhasil, gagal, mode latihan) tampil di kartu pada halaman itu sendiri; halaman scan berada di luar `/console` sehingga tidak ada `<Toaster/>` untuk toast.
  - **Batalkan check-in** (`undoCheckIn` di `src/app/actions/admin-events.ts`): petugas hanya boleh membatalkan check-in buatannya sendiri dalam 10 menit; pemegang `event.manageRegistrants` (BPH panitia, BPH Kabinet) kapan pun. Status kembali ke `confirmed`/`pending` sesuai pembayaran, tercatat di Riwayat Audit sebagai "Check-in dibatalkan". Notifikasi kehadiran yang sudah terkirim tidak ditarik.
- **Attendance Report** — agregat kehadiran vs pendaftaran per acara, untuk evaluasi/laporan kegiatan.

### Halaman acara publik: pra- vs pasca-acara

Halaman `/events/[slug]` punya dua wajah. Pemicunya: status `completed` **atau** tanggal mulai sudah lewat (`start_at < now`) — disamakan dengan penanda "lampau" di daftar acara, supaya kartu lampau tidak lagi mendarat di halaman yang masih "Daftar Sekarang".

**Daftar publik `/events`** memuat acara berstatus `published`, `registration_closed`, dan `completed`: yang mendatang tampil seperti biasa (featured = yang terdekat), yang sudah lewat masuk section **Kegiatan Sebelumnya** sebagai kartu abu-abu "Selesai" — jadi acara tidak hilang begitu panitia menandainya selesai. Beranda memakai aturan yang sama untuk "Kegiatan Terbaru" (mendatang terdekat dulu, lalu yang paling baru selesai), dan tabel **Jangkauan** di `/catalogue/sponsorship` ikut menghitung kehadiran acara `completed`.

- **Pra-acara**: kapasitas `X / Y` + bar + sisa slot, tombol daftar, agenda di sidebar, form volunteer.
- **Pasca-acara**: bar kapasitas & tombol daftar hilang, diganti "Acara ini sudah selesai."; agenda sidebar disembunyikan (timeline di kolom kiri tetap sebagai arsip); muncul bagian **Dokumentasi & Materi**; dan kotak **Isi Evaluasi** menuju kuesioner pasca-acara.

Yang diisi panitia lewat Panel Admin → tab **Pasca-Acara** → **Setelah Acara** (fitur dasar semua panitia acara; pemegang modul Kegiatan yang sudah di-scope ke acara itu juga bisa):

- **Jumlah Hadir (Final)** (`events.final_attendee_count`) — diketik manual, bukan dari check-in QR (acara Zoom/webinar sering tanpa pendaftaran portal). Kosong = halaman tetap memakai angka terdaftar.
- **Rincian Kehadiran** (`events.attendance_note`) — teks bebas mis. "80 online · 40 offline".
- **Link Video Recap / Rekaman** (`events.recap_video_url`) — tombol keluar "Tonton Recap", tidak di-embed (CSP + audiens daratan Tiongkok).
- **Album Dokumentasi** — memilih di sini mengisi `gallery_albums.event_id`. Foto highlight album tampil di halaman acara + tautan album lengkap + tombol "Unduh Semua Foto" (drive album). Foto tetap diunggah tim konten di Konten › Galeri.

### Evaluasi acara (pasca-acara)

Kuesioner pasca-acara untuk peserta di `/events/[slug]/evaluasi` — publik, **tanpa akun**, identitas opsional + toggle anonim, satu perangkat satu respons (token + unique `(event_id, responder_token)`). Tombol "Isi Evaluasi" muncul di halaman acara begitu acaranya lewat (`isPast`); detail alur di [Evaluasi Acara](./Evaluasi%20Acara.md).

- **Pertanyaan otomatis per acara**: template WIF (slug berawalan `wif`, termasuk sesi CGT) vs template umum (Registrasi, Fasilitas, Sesi & Materi, Acara & Panitia). Resolver di `src/lib/event-evaluation-template.ts` — tidak ada konfigurasi per acara di console; menambah template baru = tambah objek di file itu.
- **Rekap di console**: section *Evaluasi Acara* di `/console/events/[id]` — ringkasan (jumlah respons, rata-rata, anonim) + empat tab: **Grafik** (rata-rata & distribusi 1–10 tiap rating), **Jawaban** (preview per pertanyaan: distribusi nilai + semua jawaban teks), **Respons** (per orang + hapus respons spam), **Tabel** (isi file ekspor, baca-saja). Ekspor **CSV / Excel** (kolom mengikuti template).
- **Distribusi tautan**: tombol di halaman acara, plus section **Tautan Pendaftaran & Evaluasi** di console acara — satu klik membuat tautan pendek + QR untuk **keduanya** (`ensureEventShortLinks`, slug `daftar-<slug>` / `eval-<slug>`), idempoten dan targetnya relatif supaya QR tetap hidup saat domain pindah; modul Tautan tetap ada untuk tautan lain. Tidak ada flag buka/tutup — panitia berhenti membagikan tautannya saat periode evaluasi selesai.

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

Aturan bawaannya **semua peserta dapat e-certificate**: tiap acara punya checkbox "Peserta mendapat e-sertifikat kehadiran" (nyala secara default) — cukup dimatikan untuk acara tanpa sertifikat partisipasi. Aturannya: **tidak ada sertifikat tanpa tautan berkas https://**, dan **sertifikat peserta hanya untuk yang hadir (`attended`, QR sudah di-scan) DAN sudah mengisi evaluasi dengan akunnya** (sejak 2026-10-15; evaluasi acara bersertifikat jadi wajib login). Menyimpan folder sertifikat langsung menerbitkan ke yang berhak; sesudahnya penerbitan otomatis saat evaluasi terkirim atau saat check-in. Aturan lengkap + kode ada di [Event Flow](./Event%20Flow.md) § Setelah acara.

- **Acara tanpa absen QR / evaluasi atas nama**: dua kotak di form Edit acara, `Sertifikat hanya untuk yang tercatat hadir (QR di-scan)` dan `Evaluasi peserta boleh dikirim anonim` (keduanya nyala secara default). Mematikan yang pertama membuat sertifikat cukup untuk peserta terdaftar yang sudah mengisi evaluasi dengan akun; mematikan yang kedua membuat evaluasi selalu atas nama. Detail: [Evaluasi Acara](./Evaluasi%20Acara.md).
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
