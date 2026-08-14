# Iconography & Imagery

> Bagian dari [Design System Overview](./Design%20System%20Overview.md).

## Ikon

- **Sistem ikon: Material Symbols Outlined** (variable font Google, dimuat dengan axis `wght,FILL@100..700,0..1`), diset default `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24` di seluruh prototipe.
- Gaya: **outlined/linear**, stroke weight konsisten, sedikit rounding di sudut — selaras dengan shape language [Components](./Components.md).
- Prinsip aksesibilitas dari `patriotic_institutional/DESIGN.md`: **ikon selalu dipasangkan dengan teks** (kecuali ikon aksi yang sangat umum seperti close/search dengan `aria-label`), jangan mengandalkan ikon saja untuk makna.
- ⚠️ Sama seperti font (lihat [Typography](./Typography.md)), Material Symbols dimuat dari `fonts.googleapis.com` — **berisiko lambat di Tiongkok**. Rekomendasi: ganti ke icon set yang di-bundle sebagai SVG/komponen React (mis. **Lucide** — disebut eksplisit sebagai alternatif di `patriotic_institutional/DESIGN.md`) saat produksi, alih-alih memuat font ikon dari CDN Google. Lihat [Tech Stack](./Tech%20Stack.md).

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
