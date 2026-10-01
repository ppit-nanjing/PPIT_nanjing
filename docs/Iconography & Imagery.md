# Iconography & Imagery

> Bagian dari [Design System Overview](./Design%20System%20Overview.md).

## Ikon

- **Sistem ikon: Lucide React** (`lucide-react`, di-bundle — nol request ke CDN Google, wajib untuk keterjangkauan dari Tiongkok). Menggantikan Material Symbols Outlined yang dipakai di prototipe Stitch.
- Gaya: **outlined/linear**, stroke weight konsisten, sedikit rounding di sudut — selaras dengan shape language [Components](./Components.md).
- Prinsip aksesibilitas: **ikon selalu dipasangkan dengan teks** (kecuali ikon aksi yang sangat umum seperti close/search dengan `aria-label`), jangan mengandalkan ikon saja untuk makna.
- Ukuran memakai prop `size` (px), warna lewat `currentColor` / token teks — jangan hardcode hex.

### Ikon beranimasi

`src/components/icons/` berisi segelintir ikon beranimasi tangan untuk tempat yang cue gerak-nya benar-benar membantu — **bukan** library, bukan ditabur di mana-mana (situs institusi, restraint jadi aturan). Sekarang: `AnimatedMenuIcon` (hamburger↔X morph di nav), `AnimatedBell` (bel bergoyang sekali saat notifikasi belum dibaca bertambah), `MovingArrow` (panah CTA menggeser saat `group` di-hover). Semua di atas `motion`, tunduk `<MotionConfig reducedMotion="user">`, tetap terbaca saat animasi mati. Aturan lengkap di `src/components/icons/README.md`.

## Arah Visual Fotografi & Ilustrasi

Prototipe menyertakan folder aset visual (`stitch_ppit_nanjing_web_portal/`) yang secara eksplisit menetapkan **arah budaya fusion Indonesia × Tiongkok**:

| Aset (nama file sumber) | Arah penggunaan |
|---|---|
| Peta vector China (high-fidelity, light gray) | Ilustrasi peta persebaran cabang — dasar untuk [halaman Peta Persebaran](./Organization%20&%20Regional%20Branches.md) |
| Ikon 3D fusion Indonesia–Tiongkok (koleksi) | Ikon dekoratif hero/about — motif gabungan dua budaya |
| Pattern seamless Mega Mendung (batik Indonesia) | Tekstur latar dekoratif halus, aksen budaya Indonesia |
| Pattern seamless Parang (batik Indonesia) | Sama seperti di atas — variasi motif |
| Foto arsitektur Confucius Temple / Fuzimiao (Nanjing) | Foto heritage lokasi — konteks "Nanjing" sebagai kota, dipakai di About/Regional |
| Tekstur sutra emas bermotif bordir | Aksen premium/formal — dipakai selektif, cocok dengan token `muted-gold` |
| 3D icon set fusion Indonesia-Tiongkok | Ikon dekoratif tambahan |
| 9 ikon minimalis vector — tema edukasi | Ikon untuk kategori/fitur pendidikan (career, mentorship, dll) |
| Hero banner artistik lebar — fusion Nanjing | Banner hero utama homepage |

**Prinsip pemakaian** (dari `warm_institutional/DESIGN.md`): integrasikan foto *lifestyle* — mahasiswa beraktivitas, kumpul komunitas, momen kegiatan nyata — bukan stock photo generik. Foto dibingkai dengan radius besar (24px, `rounded-xl`) mengikuti shape language Warm. Motif batik/tekstur emas dipakai sebagai **aksen halus di background/divider**, bukan elemen dominan — jaga agar tetap minimalis dan tidak mengalahkan konten.

## Pengiriman gambar (`next/image`)

Gambar dikirim **apa adanya**, tanpa optimizer Vercel (`images.unoptimized: true` di `next.config.ts`). Alasannya: kuota optimizer di paket saat ini habis, dan saat itu setiap `/_next/image` dijawab `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`, jadi semua sampul, avatar, dan foto beranda tidak termuat di produksi; konversi on-demand per lebar juga lambat bagi pembaca di balik Great Firewall. Akibatnya **berkas sumber harus kecil sejak awal**:

- Aset statis (mis. foto kabinet): simpan sebagai **WebP** (kualitas ~80, lebar sesuai kebutuhan) di `src/assets/images/` dan `import` secara statis, supaya `next/image` tahu ukurannya dan membuat blur placeholder saat build. Jangan taruh di `public/` bila tidak ingin dapat diunduh di alamat lama.
- Unggahan lewat `ImageUploadCropper`: sisi terpanjang dibatasi **1600px** (JPEG kualitas 0,85), kecuali foto profil yang dibatasi **512px** karena paling besar hanya tampil 192px (pratinjau foto di bagan organisasi; di tempat lain 24-80px).
- Unggahan galeri (`MultiPhotoUpload`) dan `FileUpload` lewat `compressImage()`: sisi terpanjang **1920px**, WebP kualitas 0,8 (JPEG bila kanvas peramban tak bisa menulis WebP). Gambar yang sudah muat dan tidak jadi lebih kecil setelah dikodekan ulang (mis. JPEG kiriman WhatsApp), serta gambar yang tak bisa didekode peramban (mis. HEIC di Chrome desktop), dikirim apa adanya; penolakan tipe/ukuran tetap di `/api/upload`.
- Semua batas sisi terpanjang (`GALLERY_MAX_EDGE`, `CROP_MAX_EDGE`, `AVATAR_MAX_EDGE`) dan penamaan ekstensi (`imageExtension()`) ada di satu tempat, `src/lib/image-compress.ts`. Ubah di sana, jangan menambah konstanta baru di komponen.
- Pratinjau (`PhotoZoom`) memakai berkas yang sama dengan gambar kecilnya, jadi terbuka dari cache tanpa unduhan kedua.
- **Belum tertangani:** unggahan lama di Blob yang dibuat sebelum batas ini ada. Hasil ukur store produksi (2026-10-02, hanya baca): folder `gallery` dan `album` sudah kecil (maks. 162 KB), jadi yang tersisa hanya folder `avatar`: dua avatar yang masih dipakai (1,1 dan 1,4 MB, kolom `users.avatar_url`) dan dua berkas yatim yang tidak dirujuk baris mana pun (1,5 MB masing-masing). Mengecilkan atau menghapusnya menyentuh Blob dan DB produksi, jadi dilakukan terpisah setelah disetujui.

## Terkait

- [Color System](./Color%20System.md) — `muted-gold` untuk aksen tekstur emas
- [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md)
