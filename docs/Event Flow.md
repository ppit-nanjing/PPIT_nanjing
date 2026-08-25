# Event Flow

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## Alur lengkap

```mermaid
flowchart LR
    List[Events Listing] --> Detail[Event Detail]
    Detail --> Register[Event Registration Form]
    Register --> Success[Registration Success]
    Success --> Ticket[Success + QR Ticket]
    Ticket --> History[Submission History]
    Register -.status cek.-> SubmissionDetail[Event Submission Detail]
    Ticket -. acara berbayar .-> Proof[Kirim Bukti Transfer]
    Proof -. diverifikasi bendahara .-> Ticket
    Ticket -. setelah acara selesai .-> Cert[E-Certificate di Profil]
```

## Layar

| Layar | File prototipe | Catatan |
|---|---|---|
| Events (listing) | `events_ppit_nanjing`, kanonik `events_master_edition` (+ `_animated`, `_refined`) | Filter kategori, grid card |
| Event Detail | `event_details_ppit_nanjing` | Contoh konten: "Sumpah Pemuda Celebration Gala" |
| Event Registration | `event_registration_ppit_nanjing` | Form pendaftaran |
| Registration Success | `event_registration_success_ppit_nanjing` (batch 2) | Konfirmasi setelah submit |
| Registration Success + QR Ticket | `event_registration_success_qr_ticket_ppit_nanjing` (batch 2) | Tiket digital dengan QR untuk check-in |
| Event Submission Detail | `event_submission_detail_ppit_nanjing` (batch 2) | Detail satu pendaftaran (dilihat lagi dari riwayat) |
| Submission History | `submission_history_ppit_nanjing` (batch 2) | "Riwayat Pengajuan" — kemungkinan gabungan semua jenis pengajuan user (event, borrow, job), bukan event saja |

## Entitas terkait

[EVENT](./Data%20Dictionary.md), [EVENT_REGISTRATION](./Data%20Dictionary.md), [CERTIFICATE](./Data%20Dictionary.md) — `qr_code_token` di-generate saat status `confirmed`, dipakai admin untuk check-in lewat [Event Management](./Event%20Management.md) § Manage Registrations / Attendance Report.

## Acara berbayar (HTM)

Jika event ditandai berbayar, registrasi masuk sebagai **`pending` TANPA QR** — tiket menampilkan panduan bayar, bukan QR:

1. Peserta transfer sesuai instruksi bayar di detail/tiket event (opsional: deep-link Alipay yang sudah terisi nominal + memo).
2. Dari halaman tiket (`/events/[slug]/ticket`) ia **mengunggah screenshot bukti transfer** (drag & drop / pilih file / kamera).
3. Bendahara acara memverifikasi dari konsol (`/console/events/[id]`); begitu diset `verified`, pendaftaran otomatis naik ke `confirmed` dan **QR check-in diterbitkan seketika** — satu-satunya pintu QR untuk acara berbayar.

Pembayaran dihitung **perorangan**: satu pendaftaran satu tanggungan bayar, tidak ada pembayaran berkelompok. Detail sisi admin ada di [Event Management](./Event%20Management.md) § HTM.

## Pertanyaan kustom saat mendaftar

Admin bisa menambah pertanyaan per acara (teks pendek/panjang, dropdown, pilihan, pilih banyak; opsi satu per baris; bisa wajib). Tanpa pertanyaan, form tetap standar. Jawaban disimpan bersama pendaftaran (`EVENT_REGISTRATION.answers_json`) dan tampil ke admin di Daftar Pendaftar.

## Setelah acara: e-certificate & riwayat

- **Semua peserta dapat e-certificate** secara bawaan — panitia menekan satu tombol "Terbitkan Sertifikat Peserta" di konsol untuk menerbitkan sekaligus (checkbox di acara bisa mematikannya untuk acara tanpa sertifikat). Sertifikat tambahan (juara, panitia, pemateri) diterbitkan manual lewat Work Ledger, lihat [Event Management](./Event%20Management.md) § Sertifikat.
- Sertifikat yang sudah terbit tampil di **profil user**. Profil menyediakan dua akses riwayat:
  - **E-Sertifikat** — semua sertifikat yang pernah diterima user;
  - **Riwayat Acara** — acara yang pernah diikuti (semua pendaftaran, terbaru dulu, dengan chip status); riwayat lintas-domain lain (pinjam barang, lamaran kerja) tetap di `/profile/submissions`.

## Catatan implementasi

- QR code **wajib di-generate di server** (Edge Function), bukan di client, supaya token tidak bisa dipalsukan — lihat [Tech Stack](./Tech%20Stack.md).
- "Submission History" kemungkinan adalah halaman gabungan lintas-domain (event + borrow + job) — pertimbangkan sebagai satu view yang query beberapa tabel (`EVENT_REGISTRATION`, `BORROW_REQUEST`, `JOB_APPLICATION`) filtered by `user_id`, bukan tabel tersendiri. **Status implementasi:** sudah jadi `/profile/submissions` dengan pola persis itu.
- **Status:** E-Sertifikat dan Riwayat Acara sudah tampil di `/profile` (via `getMyCertificates` + query `EVENT_REGISTRATION`). `/profile/submissions` tetap ada sebagai riwayat lintas-domain (event + borrow + job).

## Terkait admin

[Event Management](./Event%20Management.md)
