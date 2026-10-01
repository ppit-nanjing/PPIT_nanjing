# Color System

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Sumber kebenaran: `src/app/globals.css`. Aturan lengkap di [DESIGN.md](../DESIGN.md) § Colors. Ditulis ulang untuk redesain Art Deco + Art Nouveau (2026-10); palet merah-putih dan Warm Institutional di versi lama sudah tidak dipakai.

Palet mengikuti struktur token bergaya **Material Design 3** (surface / on-surface / container tiers), diwarnai gading hangat, jade pekat, dan emas antik. **Semua warna adalah token.** Ada **enam palet**: tiga tema kota × terang/gelap.

## Tiga tema kota

| Tema | Karakter | Aksen utama (terang) | Dipilih lewat |
|---|---|---|---|
| **zijin** 紫金山 (bawaan) | Jade dan emas | `#0e3b32` | Tanpa atribut |
| **meihua** 梅花 | Plum-merah tua dan emas yang sama | `#6a1b3d` | `data-theme="meihua"` |
| **mingwall** 明城墙 | Slate tembok Ming dan perunggu | `#26384c` | `data-theme="mingwall"` |

Mode gelap: `data-mode="dark"`, atribut di `<html>` yang diset skrip pra-render di `layout.tsx`. Pilihan disimpan di `localStorage` (`ppit-city-theme`, `ppit-color-mode`) lewat `ThemeSwitcher` di footer.

## Palet bawaan (zijin, terang)

| Token | Hex | Peran |
|---|---|---|
| `background` / `surface` | `#f4efe3` | Gading: latar halaman |
| `warm-cream` | `#f8f3e7` | Latar hero |
| `surface-container` | `#ece4d2` | Gading-2: panel dan kartu |
| `surface-container-lowest` → `-highest` | `#faf7ee` → `#ddd2b8` | Tangga permukaan (naik = menonjol / hover / terpilih) |
| `on-background` / `on-surface` | `#1d1b14` | Tinta: teks utama (bukan hitam murni) |
| `on-surface-variant` / `secondary` | `#605b4e` | Teks sekunder (5,9:1 di atas gading) |
| `primary-container` / `heading` / `band` | `#0e3b32` | Jade: isi tombol utama, judul, pita gelap |
| `primary` / `inverse-surface` | `#0a2b25` | Jade pekat: hover, teks dan tepi tergelap |
| `on-primary` / `on-band` | `#f4efe3` | Gading di atas jade |
| `accent` / `muted-gold` | `#c6a052` | Emas: isi tombol CTA, hairline, cincin, ornamen. **Bukan teks** di atas gading (2,1:1) |
| `on-accent` | `#0a2b25` | Teks di atas emas (6,2:1) |
| `gold-ink` / `tertiary` | `#7a5c1e` | Emas aman untuk teks di atas gading (5,4:1) |
| `band-accent` / `inverse-primary` | `#e2cf9d` | Emas lembut: teks emas di pita gelap (8,1:1) |
| `blossom` | `#d98f9a` | Bunga plum. Hiasan saja, tidak pernah teks |
| `outline` / `outline-variant` | `#7a7463` / `#d4ccb8` | Tepi tegas (3:1) / hairline |
| `error` (+ 3 turunan) | `#b3261e` | Satu-satunya warna yang tidak berubah antar tema |

## Peran yang sering salah dipakai

- **Emas terang vs emas teks.** `accent` / `muted-gold` untuk isi dan ornamen; teks emas di permukaan terang = `text-gold-ink`; di pita gelap = `text-band-accent`.
- **`band` vs `inverse-surface`.** `inverse-surface` berbalik jadi terang di mode gelap; `band` tetap gelap di kedua mode. Pita Deco (Tentang, footer, kurtain intro) memakai `band`.
- **`primary-container`** di mode terang adalah jade (juga warna teks aksen, ±190 pemakaian, jadi harus tetap gelap), di mode gelap menjadi emas.
- Token tidak boleh ditambah sendiri-sendiri: tiap blok palet harus mendefinisikan **semua** token non-error, atau skrip kontras gagal.

## Memverifikasi kontras

```bash
npm run check:contrast
```

`scripts/check-contrast.ts` membaca `globals.css` apa adanya, menyusun keenam palet sesuai urutan cascade CSS, dan memeriksa pasangan yang benar-benar dipakai UI (teks di semua permukaan, tombol, pita, tepi, error) terhadap WCAG AA (4,5:1 teks, 3:1 komponen). Gagal dengan exit 1 bila ada pasangan di bawah ambang atau blok yang lupa mendefinisikan token. Jalankan setiap kali mengubah token warna.

## Pengecualian warna literal (yang sah)

Panel musim di `/login` dan `/signup` (ilustrasi tempat nyata, palet tetap), SVG merek pihak ketiga (huruf "G" Google), swatch di `ThemeSwitcher`, hex di dalam SVG `data:` (panah dropdown), dan HTML email. Selain itu, warna literal adalah bug.

## Terkait

- [Typography](./Typography.md)
- [Elevation & Shadows](./Elevation%20&%20Shadows.md)
- [Iconography & Imagery](./Iconography%20&%20Imagery.md)
