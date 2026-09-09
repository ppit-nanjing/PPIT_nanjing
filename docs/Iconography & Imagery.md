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

## Terkait

- [Color System](./Color%20System.md) — `muted-gold` untuk aksen tekstur emas
- [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md)
