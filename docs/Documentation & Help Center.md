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

## Siapa yang boleh membuka (modul `guidebook`)

Sampai 2026-10-10 semua admin bisa membuka `/console/docs` dan menerbitkan artikel: halaman dan aksinya cuma memeriksa `session.user.isAdmin`. Sejak 2026-10-11 gerbangnya kunci modul **`guidebook`** (keputusan pengurus di issue #65), terpisah dari `content` yang mengurus berita.

| Yang digerbangi | Caranya |
|---|---|
| `/console/docs`, `/console/docs/new`, `/console/docs/[slug]`, `/console/docs/guidebook`, `/console/docs/changelog` | `requireModuleAccess("guidebook")` di awal komponen halaman → dialihkan ke `/console` |
| Semua aksi di `src/app/actions/admin-docs.ts` (simpan, hapus, pulihkan, gabung, changelog) | `requireModuleAccess("guidebook")` di dalam `requireAdmin()`, jadi aksi tidak bisa dipanggil dari luar halaman |
| `GET /api/console/docs/[slug]/export` (unduh docx) | `hasModuleAccess` → **403**, bukan redirect: route handler tidak boleh melempar pengalihan halaman |
| Tautan "Dokumentasi" di sidebar | item menu diberi `module: "guidebook"`, jadi admin tanpa modul itu tidak melihat tautan ke halaman yang pasti ditolak |

Dua hal yang perlu diingat saat mengurus akses:

- Modul ini **bukan** `content`. Mengurus berita tidak otomatis memberi hak menulis panduan visa. Memberikannya lewat `/console/organization` → centang *Guidebook Maba & Help Center* pada divisi yang bersangkutan (BPH atau pusat, sesuai keputusan pengurus).
- Menyembunyikan menu bukan pengaman. Yang menahan adalah pemeriksaan di halaman, di setiap aksi, dan di rute ekspor — menu hanya ikut menyesuaikan.

### Masa berlaku topik

Aturan yang gampang berubah (imigrasi, KIP, bank) diberi tanggal tinjau ulang. Pilihan di formulir topik: *Biarkan / 3 bulan / 6 bulan / 12 bulan / Cabut masa berlaku*.

- **Topik baru** (artikel yang punya fase) yang dibiarkan di pilihan "Biarkan" langsung dapat **6 bulan**, bukan tanpa tanggal. Defaultnya di `DEFAULT_TOPIC_EXPIRY` (`src/app/actions/admin-docs.ts`).
- Default itu hanya berlaku saat pembuatan. Kalau pengurus sudah menekan *Cabut masa berlaku*, suntingan berikutnya tidak diam-diam memasang tanggal lagi.
- Artikel Help Center biasa (tanpa fase) tetap tanpa masa berlaku kecuali pengurus memilihnya sendiri.

Teks untuk artikel Help Center pengurus (tulis di `/console/docs/new`, nyalakan tampilkan di halaman publik):

> **Halaman Dokumentasi & Bantuan hanya terbuka untuk admin yang punya modul Guidebook.** Kalau menu "Dokumentasi" tidak muncul, minta BPH atau pusat mencentang *Guidebook Maba & Help Center* untuk divisimu lewat Organization Management. Topik guidebook yang baru dibuat otomatis dapat masa berlaku **6 bulan**; kalau aturannya memang tidak akan berubah, pilih *Cabut masa berlaku* supaya tidak masuk daftar tinjau ulang. Untuk topik visa, izin tinggal, biaya, dan tenggat, pakai *Tandai sudah ditinjau* setelah isinya dicek — chatbot mengutip artikel itu apa adanya.

## Chatbot Help Center: jawaban hanya dari artikel publik

Widget di `src/components/ai/help-center.tsx` (dipasang global di `src/app/layout.tsx`, bola chat hanya untuk yang login) sekarang **tidak menjawab dari pengetahuan umum model**. Alurnya:

1. `chatWithAIAction` (`src/app/actions/ai.ts`) mengambil pertanyaan terakhir.
2. `findGuideChunks` (`src/lib/guidebook-search.ts`) mencari artikel bantuan dengan **`is_public = true`** saja — pencarian leksikal: kata kunci dari `searchTerms` (`src/lib/guidebook-terms.ts`), dicocokkan lewat `ILIKE`, lalu skor di JS (judul ×4, bagian ×2, isi maks 3). Tanpa embedding: korpusnya masih puluhan artikel, jadi pencarian vektor hanya menambah vendor dan satu titik gagal baru.
3. Potongan teratas (maks 4 artikel, ±7.000 karakter) masuk ke system prompt sebagai **satu-satunya sumber**; model dilarang menambah fakta, angka, biaya, atau tenggat dari luar sumber, dan diminta menyebut judul panduannya. Tidak ada yang cocok → model menjawab belum ada panduannya dan mengarahkan ke pengurus.

**Pertanyaan Inggris.** Artikelnya bahasa Indonesia, sedangkan maba sering bertanya dalam bahasa Inggris ("how to NUAA from airport"). `SYNONYMS` di `src/lib/guidebook-terms.ts` memetakan istilah domain ke kata yang benar-benar ada di korpus: `airport` → bandara, penerbangan, pesawat; `dorm` → asrama, kos; `visa` → izin tinggal; dan seterusnya. Kata asli pengguna selalu masuk lebih dulu, jadi sinonim tidak menghabiskan kuota 10 kata kunci dan pertanyaan campuran tetap ketemu. Menambah topik baru berarti menambahkan sinonimnya di file itu — tanpa itu pertanyaannya berhenti di "belum ada panduannya" tanpa error apa pun. `npm run check:guidebook` menguji jalur ini tanpa database.

**Pertanyaan yang isinya cuma nama.** "apa itu PPIT" dan "where is nanjing at?" tidak menyisakan satu kata kunci pun, karena `ppit` dan `nanjing` dibuang sebagai kata yang muncul di hampir semua artikel. Untuk pertanyaan seperti itu `findGuideChunks` mengulang pencarian lewat `questionEntities` dan hanya mencocokkan judul serta bagian artikel, supaya seluruh korpus tidak ikut masuk konteks.

Tampilannya sejak 2026-10-12 dua bola bertumpuk di sudut kanan bawah: **Asisten AI** paling bawah, **Masukan** di atasnya, dan hanya satu panel yang bisa terbuka sekaligus. Panelnya menempel pada tumpukan itu (`absolute right-0 bottom-full mb-3`), jadi sisi kanannya selalu rata dengan bola dan jaraknya tetap 12 px dari bola teratas, berapa pun posisi widget digeser. Seluruh widget (bola + panel) digeser sebagai satu kesatuan dan posisinya disimpan per perangkat di `localStorage` (`ppitn_help_pos`); kalau tidak ada simpanan, sudut bawaannya `right-4 bottom-24` di ponsel dan `sm:right-6 sm:bottom-6` di layar lebar. Tombolnya tetap terlihat saat panelnya terbuka, klik sekali lagi untuk menutup. Buka/tutup panel dianimasikan Motion lewat `AnimatePresence`, dan `MotionConfig reducedMotion="user"` di `src/components/providers.tsx` mematikan gerak itu kalau pengguna memintanya. Efek hover dan tap bolanya **sengaja bukan Motion**: tombolnya memakai `transition-[filter,background-color] duration-200 hover:brightness-95` dan ikonnya `transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-90`, pola yang sama dengan tombol "Jelajahi Kegiatan" di `src/app/page.tsx` + `src/components/icons/moving-arrow.tsx`. Transform CSS jalan di compositor, jadi hover tetap mulus walau main thread sibuk; spring Motion di jalur hover sempat dipakai dan terasa menyendat. Motion hanya untuk pop saat panel dibuka, bukan untuk hover. Sebelumnya keduanya berbagi satu bola dengan dua tab.

**Bahasa jawaban mengikuti bahasa pertanyaan.** Pertanyaan Bahasa Inggris dijawab Bahasa Inggris, Bahasa Indonesia dijawab Bahasa Indonesia, sapaan campur dijawab Bahasa Indonesia. Judul panduan tetap dikutip apa adanya supaya sumbernya masih bisa ditelusuri. Sampai 2026-10-12 prompt-nya mengunci "Balas ramah dan ringkas dalam Bahasa Indonesia", jadi anggota yang bertanya Bahasa Inggris tetap dibalas Indonesia meskipun UI-nya sedang Bahasa Inggris.

Bahasa itu ditentukan di kode, bukan diserahkan ke model. `detectAnswerLanguage` (`src/lib/groq.ts`) menghitung kata fungsi khas tiap bahasa di pertanyaan terakhir, lalu `buildChatSystemPrompt` menerima hasilnya dan menaruh satu perintah terakhir "Aturan bahasa yang mengikat: balas dalam ...". Prompt yang tahu dua bahasa tidak cukup: seluruh isi panduan berbahasa Indonesia, dan `openai/gpt-oss-120b` (model pertama di `GROQ_MODEL_CHAIN`) menjawab satu pertanyaan Inggris dengan paragraf Indonesia ketika aturan bahasanya cuma satu kalimat di tengah prompt. Seri atau pertanyaan tanpa penanda bahasa sama sekali ("visa?", "halo") dijawab Bahasa Indonesia.

Konsekuensi untuk pengurus:

- **Artikel yang belum ditandai "Tampilkan di halaman publik" tidak akan pernah dipakai chatbot.** Itu disengaja: SOP console (isi internal) tidak boleh bocor ke jawaban anggota.
- Menambah panduan baru = tulis artikel di `/console/docs` + nyalakan toggle publik. Tanpa deploy. Guidebook maba (issue #65) memakai jalur yang sama — rencananya di [Guidebook Maba](./Guidebook%20Maba.md).

Sudah diuji langsung (2026-10-11, `findGuideChunks` dipanggil dari skrip sekali-pakai terhadap database Docker lokal): pertanyaan yang cocok dengan artikel publik mengembalikan artikel itu, istilah yang hanya ada di artikel non-publik mengembalikan daftar kosong, pertanyaan yang tidak nyambung juga kosong, dan konteks yang dikirim ke model tidak pernah memuat artikel internal.

Jawaban akhir dari model sudah terlihat di deployment pratinjau, belum di mesin lokal. Kunci Groq lokal menjawab `403 {"error":{"message":"Forbidden"}}` — sama persis saat tanpa kunci sama sekali, jadi yang diblokir IP-nya, bukan kuncinya. Karena itu jalur jawaban diuji di Chromium pada `ppit-nanjing-preview.vercel.app` (2026-10-12, dua kali oleh dua sesi berbeda: `admin@ppit-local.test` dan satu akun anggota biasa hasil daftar sendiri), pertanyaan diketik langsung di widget Help Center:

| Pertanyaan | Jawaban yang keluar |
| --- | --- |
| EN, ada sumber: "How do I get from Lukou airport to the campus?" | Bahasa Inggris, menyebut angkutan di terminal 2 |
| EN, tanpa sumber: "How much does a residence permit renewal cost this year?" | Bahasa Inggris, menolak dan mengarahkan ke pengurus, tanpa angka karangan |
| ID, ada sumber: "Bagaimana cara dari bandara menuju kampus?" | Bahasa Indonesia, bus S1 / taksi resmi, menyebut sumber *Sering Dipakai - Transportasi dari Bandara ke Kampus* |

Tidak ada error di console browser. Yang bisa dibuktikan dari mesin lokal tetap: aksi chatbot jalan sampai `groqChat`, dan prompt sistem yang disusunnya sudah benar — untuk pertanyaan yang cocok, isi artikel publik ikut terkirim sementara isi artikel non-publik tidak; untuk pertanyaan yang tidak cocok, prompt dikirim tanpa bagian panduan sama sekali, jadi instruksi "belum punya panduannya, arahkan ke pengurus" yang berlaku. Bahasa yang dipilih `detectAnswerLanguage` juga diuji di sini lewat skrip sekali-pakai terhadap sepuluh pertanyaan (Inggris, Indonesia, sapaan, satu kata, pertanyaan pendek seperti "visa?"): semuanya jatuh ke bahasa yang benar, dan `buildChatSystemPrompt` menaruh perintah bahasanya di ujung prompt — menempel pada paragraf pengecualian ubah profil, dipisah satu spasi.

SOP singkat untuk artikel Help Center pengurus (buat di `/console/docs/new`, nyalakan tampilkan di halaman publik):

> **Chatbot cuma bisa menjawab dari panduan yang sudah terbit.** Kalau chatbot bilang "belum ada panduannya", artinya belum ada artikel publik yang cocok — bukan chatbotnya rusak. Tulis/paskan panduannya di Dokumentasi & Bantuan, nyalakan "Tampilkan di halaman publik", lalu coba tanya lagi. Untuk topik visa, izin tinggal, biaya, dan tenggat, jawaban pengurus wajib ditinjau dulu sebelum diterbitkan: chatbot akan mengutip artikel itu apa adanya.
