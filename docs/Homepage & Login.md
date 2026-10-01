# Homepage & Login

> Bagian dari [Information Architecture](./Information%20Architecture.md).

## Homepage (`/`)

Halaman utama (`src/app/page.tsx`) memakai gaya Art Deco + Art Nouveau; aturan visualnya ada di [DESIGN.md](../DESIGN.md). Semua teks lewat kamus i18n (`id.ts` dan `en.ts`), semua data tetap dari database. Urutan bagian:

1. **Intro** (`SiteIntro`, hanya di `/`): kurtain jade dengan logo. Desktop: 5 lembar yang terangkat bertingkat; ponsel (680px ke bawah): satu lapisan penuh yang memudar. Murni CSS, jadi hilang sendiri walau JS gagal. Sekali per sesi tab di produksi, tiap muat di development; `?intro` memaksa tampil, `?nointro` mematikan, Back/Forward tidak memutar ulang; tidak ada saat reduced motion. Aturannya di `src/lib/intro-gate.ts`.
2. **Hero**: sunburst berputar pelan, bunga plum yang melayang, eyebrow, judul (`AnimatedHeroHeading`, kata terakhir berwarna emas-teks), subteks, kartu semboyan (teks baku, jangan diparafrasekan), CTA emas, dan CTA kedua yang berganti ke "Lengkapi Sensus" bila sensus anggota yang login belum lengkap. Garis foil emas di bawahnya.
3. **Statistik**: tiga medali bercincin emas (jumlah kota naungan dan kampus dari database, tahun berdiri 2008), tiga kolom sejajar juga di ponsel. Tidak ada angka jumlah anggota karena tidak dikumpulkan per kota.
4. **Tentang**: pita jade berlatis emas dengan judul, dua paragraf (`about.intro`, `about.coverageText`), dan `QuoteCard` kutipan Ketua Umum (`home.quote.*`).
5. **Kebersamaan**: foto kabinet (`src/assets/images/kabinet-ppit-nanjing.jpg`, diimpor statis supaya blur placeholder dibuat saat build, dan sengaja tidak ada di `public/`) dalam bingkai lengkung via `next/image`; keterangan dari `home.family.*`. Foto bisa diklik: `PhotoZoom` membukanya penuh dalam `<dialog>` modal (Esc, klik di luar foto, atau tombol tutup untuk menutup). Foto ini memuat banyak orang yang bisa dikenali: pastikan para anggota setuju sebelum dipasang di situs publik.
6. **Kota naungan**: sembilan kartu lengkung dengan nama Mandarin; Nanjing adalah kartu emas "Markas Utama". Klik kartu untuk membuka detail. Di ponsel (di bawah `sm`, 640px) kesembilannya jadi grid 3 x 3 lengkung kecil (nama + hanzi); detailnya muncul di panel selebar baris tepat di bawah baris kartu yang diketuk.
7. **Kegiatan Terbaru** dan 8. **Kabar Terbaru**: tiga item terbaru dari database, atau keadaan kosong yang jujur bila belum ada. Di ponsel tiap item jadi satu baris ringkas (gambar kecil di kiri, judul, tanggal; tanpa kutipan dan tombol "Baca"), jadi tiga baris.
9. **Footer**: pita gelap (`band`): kartu "Ayo bergabung", kolom navigasi, pemilih tema kota dan mode. Di ponsel: merek di atas, kolom Jelajahi dan Temukan berdampingan, kolom Tentang dua kolom, pemilih tema berupa grid 3 kolom.

Nav dan footer dipakai hampir semua halaman publik (tiap halaman mengimpornya sendiri, bukan lewat layout).

## Login (`/login`)

3 varian: `login_ppit_nanjing` (dasar), `login_refined_inputs` (pola input final — lihat [Components](./Components.md) § Input Field), `login_with_google` (OAuth).

- Form: email + password, checkbox "remember me", link "forgot password" (bukan layar terpisah di prototipe — perlu ditambahkan saat build).
- **Login with Google** — tombol OAuth terpisah, diimplementasikan lewat Auth.js v5 Google Provider (lihat [Tech Stack](./Tech%20Stack.md)).

## Entitas terkait

[USER](./Data%20Dictionary.md), [ROLE](./Data%20Dictionary.md) — lihat [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md).

## Alur lanjutan

Login berhasil → redirect ke Homepage (state logged-in) atau `/admin` jika role admin. Belum punya akun → [Join Us Flow](./Join%20Us%20Flow.md).
