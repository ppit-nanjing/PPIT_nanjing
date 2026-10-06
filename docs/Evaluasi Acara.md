# Evaluasi Acara

> Bagian dari [Information Architecture](./Information%20Architecture.md). Fitur baru: **2026-09-29** (kebutuhan WIF 2026 X CGT).

Kuesioner pasca-acara: peserta mengisi lewat tautan publik (tanpa akun), hasilnya dibaca pengurus di console. Dipakai pertama kali untuk **WIF 2026 X CGT** (`/events/wif-2026/evaluasi`), dirancang agar bisa dipakai ulang untuk acara lain dengan mengunjungi `/events/<slug>/evaluasi`.

## Alur

```mermaid
flowchart TD
    Event["/events/:slug (pasca-acara, isPast)"] --> CTA["Tombol 'Isi Evaluasi'"]
    CTA --> Form["/events/:slug/evaluasi"]
    Share["Panitia: short link + QR di /console/links"] --> Form
    Form --> Submit["Server Action submitEventEvaluation()"]
    Submit -->|semua wajib terisi (kecuali opsional) & token baru| DB[("event_evaluations")]
    Submit -->|token sudah pernah| Already["Layar 'sudah mengisi'"]
    DB --> Console["/console/events/:id → section 'Evaluasi Acara'"]
    Console --> Export["Ekspor CSV / Excel"]
    Console --> Delete["Hapus respons (anti-spam, ConfirmButton)"]
```

## Rute

| Rute | Isi |
|---|---|
| `/events/:slug/evaluasi` | Form publik. `draft`/`scheduled` → 404. Tanpa login; identitas opsional; satu perangkat satu respons (token `localStorage` + unique `(event_id, responder_token)`). |
| `/console/events/:id` | Section **Pertanyaan Evaluasi** (builder + pratinjau, lihat di bawah) dan section **Evaluasi Acara** (CollapsibleSection): ringkasan (jumlah respons, rata-rata, anonim) + **3 tab** — *Grafik* (rata-rata & distribusi tiap rating; hitungan per pilihan), *Jawaban* (preview jawaban per pertanyaan: distribusi nilai + semua teks), *Respons* (daftar per orang + hapus). |
| `/api/console/events/:id/evaluasi/export?format=csv\|xlsx` | Ekspor lengkap. Template tetap: 14 kolom. Pertanyaan sendiri: satu kolom per pertanyaan. Akses: sesi dengan akses console acara ini (sama seperti halaman console-nya). |

## Dua mode pertanyaan

| Mode | Kapan | Pertanyaan | Jawaban disimpan di |
|---|---|---|---|
| **Template tetap** | Acara belum punya pertanyaan sendiri (default semua acara, termasuk WIF 2026) | WIF atau umum, dipilih dari slug (bagian "Pertanyaan (skema tetap)" di bawah) | kolom bawaan `event_evaluations` |
| **Pertanyaan sendiri** | Acara punya ≥ 1 baris di `event_evaluation_questions` | Dibuat panitia di console | `event_evaluation_answers` (satu baris per jawaban) |

Pindah mode otomatis: begitu pertanyaan pertama ditambahkan, form publik, rekap, dan ekspor memakai pertanyaan sendiri; kalau semua pertanyaan dihapus lagi, acara kembali ke template tetap. Respons yang sudah masuk tidak pernah dihapus oleh perpindahan ini (respons lama tidak tampil di rekap mode lain, tapi tetap ada di ekspor).

### Builder pertanyaan evaluasi (`/console/events/:id` → "Pertanyaan Evaluasi")

- Dipakai panitia yang boleh mengatur form pendaftaran (kapabilitas `event.registrationForm`, dasar untuk semua panitia). Pola dan tampilannya sama dengan builder "Pertanyaan Pendaftaran", tapi tabelnya terpisah (`event_evaluation_questions`) supaya form pendaftaran tidak ikut berubah.
- Tipe pertanyaan: **Penilaian 1–10**, Teks Pendek (≤ 300 karakter), Teks Panjang (≤ 2000), Dropdown, Pilihan (radio), Pilih Banyak (centang). Opsi satu per baris; maksimal 30 opsi, 120 karakter per opsi, maksimal 40 pertanyaan per acara. Tiap pertanyaan bisa wajib atau opsional.
- **Mulai dari template standar**: tombol (hanya muncul saat belum ada pertanyaan sendiri) menyalin pertanyaan template WIF/umum menjadi pertanyaan yang bisa diedit. Ini cara memakai WIF sebagai acuan.
- **Tipe terkunci setelah ada jawaban**: nilai rating (angka) dan teks disimpan berbeda, jadi tipe tidak bisa diubah kalau sudah ada yang menjawab; hapus dan buat pertanyaan baru. Label, opsi, dan wajib/opsional tetap bisa diedit.
- **Menghapus pertanyaan tidak menghapus jawabannya**: tiap jawaban menyimpan salinan label dan tipe pertanyaannya, jadi rekap dan ekspor tetap menampilkannya dengan tanda "(pertanyaan sudah dihapus)".
- **Pratinjau** ("Pratinjau form evaluasi" di dalam section): komponen form publik yang sama persis dengan `preview` aktif: tombol kirim mati, tidak ada yang tersimpan, token perangkat tidak disentuh. Bisa dibuka walau acara masih draft (form publiknya sendiri 404 selama draft/terjadwal).

## Pertanyaan (skema tetap)

| Kolom | Pertanyaan | Tipe |
|---|---|---|
| `rating_registration` | Efektivitas sistem registrasi (daftar, tiket QR, informasi) | 1–10, wajib |
| `improve_registration` | Improve registrasi untuk tahun berikutnya | teks, wajib |
| `rating_facilities` | Kepuasan fasilitas — venue s.d. snacks | 1–10, wajib |
| `improve_facilities` | Improve fasilitas & sarpras | teks, wajib |
| `rating_cgt` | Manfaat sesi sharing CGT | 1–10, wajib |
| `cgt_message` | Kesan & pesan untuk sharing CGT | teks, wajib |
| `rating_overall` | Kepuasan keseluruhan (pelayanan panit s.d. games) | 1–10, wajib |
| `improve_service` | Improve pelayanan panitia s.d. games | teks, wajib |
| `overall_message` | Kesan, pesan & saran keseluruhan | teks, wajib |
| `heartwarming` | Heartwarming message for panitia (opsional) | teks |

Identitas: `respondent_name` + `respondent_city` (opsional) dan flag `anonymous` — kalau anonim dicentang, server **tidak menyimpan** nama/kota sama sekali.

## Template pertanyaan (berlaku untuk semua acara)

Setiap acara otomatis punya halaman evaluasi (tombol "Isi Evaluasi" muncul di halaman acara begitu acaranya lewat). Pertanyaannya dipilih otomatis dari **template** di `src/lib/event-evaluation-template.ts`:

- **`wif`** — dipakai untuk slug yang berawalan `wif` (mis. `wif-2026`): 10 pertanyaan persis versi WIF 2026 X CGT (termasuk sesi sharing CGT).
- **`umum`** — default untuk semua acara lain: struktur sama (Registrasi, Fasilitas, Sesi & Materi, Acara & Panitia) dengan kalimat generik tanpa nama acara/sesi tertentu.

Skema DB tetap sama untuk kedua template (4 kolom rating + 6 kolom teks); yang berbeda hanya label yang ditampilkan. Menambah template acara baru = tambah satu objek di file itu dan daftarkan di `evaluationTemplateForSlug()` — tidak perlu migrasi.

## Operasional panitia

1. **Sebar**: buat short link di `/console/links` (contoh slug `eval-wif26`, target `/events/wif-2026/evaluasi`) → unduh QR → tempel ke grup WeChat. Tombol "Isi Evaluasi" juga otomatis muncul di halaman acara setelah acara lewat.
2. **Pantau**: `/console/events/<id>` → section "Evaluasi Acara". Rata-rata masuk akal enggak, teksnya kebaca.
3. **Rekap**: tombol **CSV** / **Excel** — untuk LPJ. Respons uji spam tinggal hapus per baris.
4. Satu perangkat hanya bisa mengisi sekali; kalau ada yang isi keliru, minta hapus di console lalu isi ulang dari perangkat yang sama TIDAK bisa (token sudah terpakai) — hapus dulu barisnya baru orang itu bisa isi lagi.

## Catatan teknis

- Migrasi: `drizzle/0040_event_evaluations.sql` (tabel `event_evaluations`, FK ke `events` ON DELETE CASCADE, unique `(event_id, responder_token)`).
- Server Action: `src/app/actions/event-evaluations.ts` (`submitEventEvaluation`, `deleteEventEvaluation`). Validasi: rating 1–10 wajib, pertanyaan teks wajib kecuali `heartwarming` (opsional), teks ≤ 2000 char, token 8–100 char; error duplikat Postgres `23505` → state `already`.
- Form: `src/components/events/event-evaluation-form.tsx` (client, `useActionState`; radio 1–10 native `required`; token perangkat `ppit_eval_token`; flag selesai `ppit_eval_done_<slug>`).
- Halaman: `src/app/events/[slug]/evaluasi/page.tsx` (i18n `id`/`en`, kota memakai urutan kanonik `src/lib/coverage-cities.ts`).
- Ekspor memakai `src/lib/report-export.ts` yang sama dengan ekspor sensus.
- Kalau fitur ini tidak dipakai lagi untuk acara tertentu: cukup berhenti membagikan tautannya (tidak ada flag buka/tutup).

### Pertanyaan sendiri (builder)

- **Migrasi `drizzle/0044_event_evaluation_questions.sql`**: tabel `event_evaluation_questions` (tipe dibatasi CHECK), `event_evaluation_answers` (FK ke respons ON DELETE CASCADE; FK ke pertanyaan ON DELETE SET NULL; salinan `question_label`/`question_type`), dan **empat kolom penilaian bawaan di `event_evaluations` jadi boleh NULL** (respons pertanyaan sendiri tidak mengisinya; kolom itu juga pembeda: `rating_registration IS NULL` = respons pertanyaan sendiri). Jalankan dengan `npx tsx --env-file=.env src/db/apply-sql.ts drizzle/0044_event_evaluation_questions.sql` setelah memastikan targetnya database yang benar.
- **Kode toleran terhadap migrasi yang belum jalan**: `src/lib/event-evaluation-queries.ts` membaca tabel baru dan menganggap error Postgres `42P01` (tabel tidak ada) sebagai "tidak ada pertanyaan sendiri", jadi kode boleh ter-deploy sebelum migrasi tanpa merusak konsol, form publik, atau pengiriman evaluasi (semua acara tetap pakai template tetap). Builder sendiri (aksi simpan) baru bisa dipakai setelah migrasi.
- Server Action builder: `src/app/actions/event-evaluation-questions.ts` (`saveEventEvaluationQuestion`, `deleteEventEvaluationQuestion`, `startEvaluationFromTemplate`); UI: `src/components/console/evaluation-questions-builder.tsx`.
- Pengiriman jawaban: `submitEventEvaluation` memilih jalur dari ada-tidaknya pertanyaan sendiri. Jalur sendiri (`submitCustomEvaluation`) membaca field `q_<id pertanyaan>`, memvalidasi per tipe (`validateEvalAnswer` di `src/lib/event-evaluation-questions.ts`: rating bulat 1–10, teks dibatasi panjang, pilihan harus salah satu opsi), lalu menulis respons + semua jawaban dalam satu `db.batch` (satu transaksi). Aksi ini juga menolak acara `draft`/`scheduled` (sebelumnya hanya halamannya yang 404).
- Rekap dan ekspor memakai fungsi murni di `src/lib/event-evaluation-results.ts` (kolom = pertanyaan sekarang + pertanyaan terhapus yang masih punya jawaban).
- Teks UI baru (`eval.choose`, `eval.previewBanner`, `eval.previewSubmit`) ada di kedua kamus `id`/`en`. Teks builder dan rekap di console tetap Indonesia, seperti bagian console lainnya.
