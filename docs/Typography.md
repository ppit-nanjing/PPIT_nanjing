# Typography

> Bagian dari [Design System Overview](./Design%20System%20Overview.md).

## Font Family

- **Inter** — satu-satunya typeface untuk seluruh UI (weight 400/700/800 dimuat via Google Fonts di semua prototipe: `family=Inter:wght@400;700;800`).
- **Material Symbols Outlined** — font ikon variable (lihat [Iconography & Imagery](./Iconography%20&%20Imagery.md)).

⚠️ Kedua font di-load dari `fonts.googleapis.com` di setiap prototipe. Ini **berisiko lambat/gagal load** untuk pengguna yang mengakses dari Tiongkok daratan (Google domains sering diblokir/lambat tanpa VPN) — lihat catatan penting di [Tech Stack](./Tech%20Stack.md) § Pertimbangan Jaringan Tiongkok. **Rekomendasi:** self-host file font Inter (`.woff2`) dan ganti Material Symbols dengan icon set yang di-bundle (mis. Lucide) alih-alih memuat dari CDN Google saat produksi.

## Skala Tipografi (Warm Institutional — kanonik)

| Token | Ukuran | Weight | Line-height | Letter-spacing | Pemakaian |
|---|---|---|---|---|---|
| `display-hero` | 56px (mobile: 36px) | 800 | 1.1 (mobile 1.2) | −0.03em (mobile −0.02em) | Judul hero halaman utama |
| `headline-lg` | 32px | 700 | 1.3 | −0.01em | Judul section besar |
| `headline-md` | 24px | 700 | 1.4 | −0.01em | Judul card/subsection |
| `body-lg` | 18px | 400 | 1.75 | — | Intro paragraph, lead text |
| `body-md` | 16px | 400 | 1.65 | — | Body text default |
| `label-caps` | 12px | 600 | 1.5 | +0.1em | Label UPPERCASE (kategori, eyebrow text) |
| `quote-text` | 22px | 400 (italic saat dipakai) | 1.6 | — | Kutipan pimpinan/testimoni |

Semua nilai ini di-generate sebagai custom `fontSize` key di `tailwind.config` tiap file (`text-display-hero`, `text-headline-lg`, dst) — bukan skala default Tailwind. Saat implementasi, definisikan sebagai `theme.extend.fontSize` persis seperti ini agar kelas utility (`text-headline-lg` dll) bisa dipakai langsung dari hasil prototipe tanpa refactor besar.

## Legacy — Patriotic Institutional (v1)

| Token | Ukuran | Weight | Line-height |
|---|---|---|---|
| `display-hero` | 48px (mobile 32px) | 800 | 1.1 |
| `headline-lg` | 32px | 700 | 40px |
| `headline-md` | 24px | 700 | 32px |
| `body-lg` | 18px | 400 | 28px |
| `body-md` | 16px | 400 | 24px |
| `label-caps` | 12px | 700 | 16px, +0.05em |
| `quote-text` | 20px | 400 | 32px |

Perbedaan utama vs Warm: ukuran hero lebih kecil (48px vs 56px), line-height dalam px absolut (bukan rasio), tracking label lebih sempit. Warm Institutional lebih "lapang" secara sengaja — lihat rationale di `warm_institutional/DESIGN.md`.

## Prinsip Hierarki

- **Hierarki lewat ukuran + weight**, bukan warna — `display-hero`/`headline-*` selalu bold/extra-bold, body selalu regular (400).
- **Uppercase label** (`label-caps`) dipakai untuk eyebrow text, kategori section, dan badge — selalu dengan tracking positif agar tetap terbaca meski kecil.
- **Quote/kutipan** memakai ukuran lebih besar dari body-lg tapi lebih ringan secara visual (italic), dengan kata kunci di-bold atau diwarnai `primary`.
- **Statistik besar** (mis. "15K+ INDONESIAN STUDENTS" di homepage referensi) memakai angka bold skala besar (setara `headline-lg`/`display-hero`) dipasangkan dengan label kecil `label-caps` di bawahnya.

## Bahasa Konten

Konten produk memakai **campuran Bahasa Indonesia dan Inggris** tergantung konteks — halaman publik utama (Home, About, Sensus, Events) sebagian besar berbahasa Indonesia (`lang="id"` di `<html>`), sementara Admin Console dan beberapa halaman karir/dokumentasi berbahasa Inggris. **Rekomendasi:** rencanakan i18n (mis. `next-intl`) sejak awal alih-alih hardcode string campuran, supaya konsisten — lihat [Tech Stack](./Tech%20Stack.md).

## Terkait

- [Spacing System](./Spacing%20System.md) — jarak vertikal antar blok teks
- [Components](./Components.md)
