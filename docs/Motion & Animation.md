# Motion & Animation

> Bagian dari [Design System Overview](./Design%20System%20Overview.md). Diringkas dari `ppit_nanjing_animation_system_prd.md` (dokumen ini sudah lengkap di sumber — catatan di bawah adalah ringkasan + keterkaitannya dengan bagian desain lain).

## 4 Tier Hierarki Animasi

| Tier | Trigger | Perilaku | Durasi | Easing |
|---|---|---|---|---|
| **1 — Page Transition** | Load halaman/navigasi | Fade-in global container | 400ms | `cubic-bezier(0.4,0,0.2,1)` |
| **2 — Section Entrance** | Scroll intersection (15% visible) | Fade-in-up (y: 20px), stagger 100ms antar elemen dalam grid | 600ms | — |
| **3 — Micro-interaction** | Hover/tap | Card: scale 1.02 + shadow naik. Button: transisi warna + scale 0.98 saat klik. Link: underline slide-in kiri→kanan | 200ms | — |
| **4 — Overlay** | Hover (tooltip) / klik (modal) | Tooltip: scale-fade dari anchor. Modal: zoom-fade center-out + backdrop blur 40% opacity | 300ms | — |

## Komponen-spesifik

| Komponen | Gaya animasi | Arah |
|---|---|---|
| Hero headline | Stagger per kata/karakter | Bawah → atas |
| Data card | Group reveal | Scale-in + fade |
| Sidebar admin | Slide & push | Kiri → kanan |
| Marker peta | Pulse ambient | Dari tengah |
| Form input | Focus ring expand | Inward stroke |

## Tooltip System

Konsisten di semua area data-berat (Admin, Peta, Sensus): background `surface-container-highest`, teks `on-surface`, border 1px `outline-variant`, shadow `elevation-2`, delay hover 150ms, posisi default `top` dengan `auto-flip` dekat tepi viewport.

## Aksesibilitas & Performa

- **Wajib** menghormati `prefers-reduced-motion: reduce` → fallback ke opacity fade sederhana / state statis untuk semua tier.
- Implementasi: Tailwind transitions untuk Tier 3–4, `IntersectionObserver` + CSS keyframes untuk Tier 1–2. **Tanpa library JS animasi berat** (eksplisit dari PRD — selaras dengan tujuan "ringan" di [Tech Stack](./Tech%20Stack.md)).
- Target 60fps konsisten di perangkat mid-range.

## Token integrasi warna

Warna aktif/fokus animasi memakai `primary` (`#d42b2b` di dokumen PRD — nilai ini sebenarnya `primary-container` di token final, lihat [Color System](./Color%20System.md), kemungkinan penamaan longgar di PRD asli). Transisi background surface bergerak dari `surface-container-low` → `surface-container-high`.

## Motion Deco (redesain 2026-10)

Ornamen Art Deco + Art Nouveau digerakkan **CSS murni**, terpisah dari library Motion yang dipakai komponen masuk (`Reveal`, `AnimatedHeroHeading`, `CountUp`):

| Elemen | Keyframes | Catatan |
|---|---|---|
| Bunga plum (`PlumBlossoms`) | `deco-drift`, `deco-fall` | Melayang di tempat, atau jatuh melintasi hero. Hiasan, `aria-hidden`. |
| Sunburst hero | `deco-spin` (140 detik/putaran) | Sangat pelan. |
| Garis foil emas | `deco-foil` | Kilau emas bergeser di bawah hero. |
| Intro `/` (`SiteIntro`) | `intro-slat`, `intro-logo-*`, `intro-veil-out` | Desktop 5 lembar, ponsel satu lapisan. Hilang sendiri lewat state akhir animasi. |

**Reduced motion:** aturan global menyusutkan durasi animasi dan transisi jadi ~0. Karena itu **state akhir tiap animasi harus tetap terlihat benar**: bunga yang jatuh (`deco-fall` berakhir transparan) diberi `animation: none` dan diletakkan di `--y`-nya sehingga tetap tampil diam; intro dihapus (`display: none`); sunburst dan foil berhenti. Jangan pernah membiarkan animasi yang runtuh berakhir pada keadaan tak terlihat. Aturan pemutaran intro ada di `src/lib/intro-gate.ts`; navigasi biasa ke beranda tidak memutar ulang (muat penuh: sekali per sesi), sedangkan klik logo memutarnya — dari halaman lain via flag `ppit-intro-force`, saat sudah di beranda via event `ppit:intro-replay`.

## Terkait

- [Elevation & Shadows](./Elevation%20&%20Shadows.md) — shadow yang dianimasikan di Tier 3
- [Components](./Components.md)
