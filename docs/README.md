# 🗺️ PPIT Nanjing — Map of Content

> Hub navigasi utama proyek. Mulai dari [Overview](./Overview.md) kalau baru pertama kali buka folder ini.

## 📍 Overview

- [Overview](./Overview.md) — ringkasan proyek, status, langkah selanjutnya
- [Goal.md](./Goal.md) — working checklist prototype-parity, durable memory lintas context reset
- [Progress & Handoff.md](./Progress%20&%20Handoff.md) — living status doc, mulai di sini kalau ambil alih sesi/dev baru
- [Perbandingan dengan PPIT Chongqing.md](./Perbandingan%20dengan%20PPIT%20Chongqing.md) — audit fitur dibanding cabang lain
- [PRODUCT.md](../PRODUCT.md) — product truth (users, purpose, positioning, constraints, locked brand) — for the impeccable skill
- [DESIGN.md](../DESIGN.md) — the **real** visual system extracted from `globals.css` + components (via `/impeccable document`, 2026-09-09). The `Design System/*` notes below are pre-2026-08 and describe a superseded palette

## 🧭 Information Architecture

- [Information Architecture](./Information%20Architecture.md) — peta 63 layar unik, rute usulan, peta navigasi

## 🎨 Design System

- [Design System Overview](./Design%20System%20Overview.md) — hub, termasuk temuan drift spek-vs-implementasi
- [Color System](./Color%20System.md)
- [Typography](./Typography.md)
- [Spacing System](./Spacing%20System.md)
- [Elevation & Shadows](./Elevation%20&%20Shadows.md)
- [Iconography & Imagery](./Iconography%20&%20Imagery.md)
- [Components](./Components.md)
- [Motion & Animation](./Motion%20&%20Animation.md)

## 🗄️ Data Model

- [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md) — 27 entitas, diagram Mermaid lengkap
- [Data Dictionary](./Data%20Dictionary.md) — kolom & enum lengkap per entitas

## ⚙️ Tech Stack

- [Tech Stack](./Tech%20Stack.md) — Next.js + Neon Postgres + Vercel, termasuk catatan reachability Tiongkok

## 🔧 Operations & Migration

- [Setup Env & Migrasi Akun.md](./Setup%20Env%20&%20Migrasi%20Akun.md) — daftar lengkap environment variable + urutan migrasi layanan (GitHub, Vercel, Neon, Google Cloud) ke akun Gmail organisasi
- [Migrasi Akun ke PPIT Nanjing.md](./Migrasi%20Akun%20ke%20PPIT%20Nanjing.md) — kondisi tiap layanan sebelum dipindah dari akun pribadi
- [Migrasi Subdomain ppitiongkok.md](./Migrasi%20Subdomain%20ppitiongkok.md) — status migrasi ke `nanjing.ppitiongkok.com`, menunggu DNS dari pusat

## 🖥️ Screens — Public Website

- [Homepage & Login](./Homepage%20&%20Login.md)
- [Organization & Regional Branches](./Organization%20&%20Regional%20Branches.md)
- [Event Flow](./Event%20Flow.md)
- [Content Pages](./Content%20Pages.md) (News, Gallery, Legal)
- [Career Flow](./Career%20Flow.md) (Jobs, Career Center, Mentorship)
- [Join Us Flow](./Join%20Us%20Flow.md)
- [Equipment Lending Flow](./Equipment%20Lending%20Flow.md)
- [Sensus Profile Flow](./Sensus%20Profile%20Flow.md)

## 🛠️ Screens — Admin Console

- [Admin Dashboard](./Admin%20Dashboard.md)
- [User & Role Management](./User%20&%20Role%20Management.md)
- [Konfirmasi Akses Admin.md](./Konfirmasi%20Akses%20Admin.md) — tabel `adminModuleScope` per divisi, dikonfirmasi langsung dari database produksi
- [Organization Management](./Organization%20Management.md)
- [Event Management](./Event%20Management.md)
- [Inventory Management](./Inventory%20Management.md)
- [Reports & Analytics](./Reports%20&%20Analytics.md)
- [Documentation & Help Center](./Documentation%20&%20Help%20Center.md)

## Cara membaca folder ini

```
Projects/PPIT Nanjing/
├── Overview.md                          ← mulai di sini
├── 🗺️ PPIT Nanjing MOC.md               ← kamu di sini
├── Information Architecture.md
├── Tech Stack.md
├── Design System/                       ← 8 note
├── Data Model/                          ← 2 note (ERD + Data Dictionary)
└── Screens/
    ├── Public/                          ← 8 note flow
    └── Admin/                           ← 7 note modul
```

Setiap note saling terhubung lewat wikilink — buka **Graph View** Obsidian dan filter ke folder `Projects/PPIT Nanjing/` untuk melihat peta relasinya secara visual.
