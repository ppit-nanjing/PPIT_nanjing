# Elevation & Shadows

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Nilai di bawah diambil langsung dari kelas `shadow-[...]` arbitrary-value yang benar-benar dipakai di ≥15 file `code.html` berbeda (bukan diasumsikan) — jadi ini adalah shadow system **yang sudah diimplementasikan secara konsisten** di seluruh prototipe, meski tidak pernah ditulis eksplisit sebagai token di `DESIGN.md`.

## Filosofi

Sesuai `warm_institutional/DESIGN.md`: **menolak shadow tebal dan divider kontras tinggi**. Elevasi dikomunikasikan lewat *ambient shadow* yang sangat diffused (opacity rendah) dan *tonal layering* (pergeseran warna surface-container), bukan garis tegas atau bayangan keras. Efeknya harus terasa seperti "soft glow", bukan "hard edge".

## Skala Elevasi

| Level | Box-shadow | Opacity | Pemakaian |
|---|---|---|---|
| `elevation-0` (flat) | *(tidak ada)* — border 1px `outline-variant` bila perlu | — | Default resting state kebanyakan card, mengikuti filosofi "tonal layers over shadows" |
| `elevation-ambient` | `0 10px 30px rgba(39,23,22,0.04)` | 4% | Card fitur, panel form, quote block — shadow utama Warm Institutional |
| `elevation-panel` | `0 4px 20px rgba(0,0,0,0.02–0.03)` / `0 2px 10px rgba(0,0,0,0.02)` | 2–3% | Panel admin console, tabel data, dokumentasi hub |
| `elevation-sticky` | `0 -4px 20px rgba(0,0,0,0.02–0.05)` | 2–5% | Bottom action bar / sticky footer form (bayangan mengarah ke atas) |
| `elevation-cta` | `0 4px 12px rgba(212,43,43,0.3)` resting → `0 6px 20px rgba(176,8,22,0.3)` hover | 20–30% | Tombol primer/CTA utama — **shadow berwarna merah brand**, bukan netral |
| `elevation-accent` | `0 4px 20px -4px rgba(176,8,22,0.1)` resting → `0 8px 24px -4px rgba(176,8,22,0.2)` hover | 10–20% | Stat card / highlight card di admin dashboard |

## Prinsip pemakaian

- **Netral vs berwarna**: shadow netral (`rgba(0,0,0,...)` atau `rgba(39,23,22,...)`) untuk elevasi struktural biasa (card, panel). Shadow **berwarna merah** (`rgba(176,8,22,...)` / `rgba(212,43,43,...)`) khusus untuk elemen yang memang ingin menonjol sebagai aksi utama (CTA button, stat card unggulan) — dipakai sebagai penanda hierarki visual, bukan dekorasi acak.
- **Transisi**: semua perubahan shadow (resting → hover) harus animasikan lewat `transition-all duration-300` mengikuti [Motion & Animation](./Motion%20&%20Animation.md) Tier 3.
- **Border sebagai pengganti shadow**: untuk elemen yang duduk di atas background berwarna (bukan putih polos), gunakan border 1px `outline-variant`/`soft-gray` alih-alih shadow — shadow tidak selalu terlihat jelas di atas background non-putih.

## Terkait

- [Color System](./Color%20System.md) — nilai warna sumber shadow bertema merah
- [Components](./Components.md)
