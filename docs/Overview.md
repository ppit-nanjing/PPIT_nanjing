# PPIT Nanjing — Overview

| | |
|---|---|
| **Tipe** | Main — Web Portal Organisasi |
| **Status** | 🎨 Design → Dev-ready (dokumentasi lengkap, belum ada kode produksi) |
| **Sumber prototipe** | `stitch_ppit_nanjing_web_portal/` + `stitch_ppit_nanjing_web_portal (1)/` (folder lokal, hasil generate Google Stitch) |
| **Peta navigasi** | [PPIT Nanjing MOC](./README.md) |

## Apa ini

**PPIT Nanjing** adalah portal web resmi untuk cabang Nanjing dari **PPI Tiongkok** (Perhimpunan Pelajar Indonesia Tiongkok) — organisasi payung mahasiswa Indonesia yang kuliah di Tiongkok, dengan 32 cabang regional di seluruh negeri. Portal ini melayani dua audiens:

1. **Publik/anggota** — info organisasi, event, berita, galeri, loker/karir, sensus data mahasiswa, peminjaman inventaris.
2. **Admin/pengurus** — console manajemen penuh: user & role, struktur organisasi, event, inventaris, laporan, dan pusat dokumentasi in-app (penting karena kepengurusan mahasiswa berganti tiap periode).

Referensi konten nyata diambil dari situs nasional `ppitiongkok.com` (di-scrape ke `extracted_text_from_https_www.ppitiongkok.com.md` di folder prototipe) — tagline resminya: *"Wadah resmi perhimpunan pelajar Indonesia di Tiongkok untuk bersinergi, berkarya, dan berkontribusi bagi bangsa."*

## Status pekerjaan

Prototipe UI (95 file `code.html` dari Google Stitch, ~63 layar fungsional unik) **sudah ada duluan** di dua folder lokal. Pekerjaan yang dilakukan lewat sesi ini adalah **merekonstruksi & melengkapi dokumentasi** di sekitar prototipe tersebut supaya siap masuk fase development:

- ✅ [Information Architecture](./Information%20Architecture.md) — peta 63 layar, rute usulan, dikelompokkan per flow
- ✅ [Design System](./Design%20System%20Overview.md) lengkap (warna, tipografi, **spacing system**, elevasi, ikonografi, komponen, motion) — direkonstruksi dari `DESIGN.md` + `tailwind.config` yang di-embed di kode prototipe, termasuk temuan drift/inkonsistensi yang perlu diselaraskan sebelum build
- ✅ [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md) — 27 entitas, diturunkan dari analisis fungsional seluruh layar
- ✅ [Tech Stack](./Tech%20Stack.md) — rekomendasi Next.js + Supabase + Vercel, dengan catatan khusus reachability jaringan Tiongkok

## Yang belum ada / langkah selanjutnya

- Belum ada kode produksi (repo Next.js belum dibuat).
- Belum ada Supabase project untuk PPIT Nanjing (MCP Supabase tersedia di environment ini, siap dipakai begitu keputusan stack difinalkan bersama pengurus).
- Beberapa gap fungsional ditemukan saat analisis (lihat catatan "⚠️" di masing-masing modul admin, mis. tidak ada layar CRUD *tambah barang inventaris baru* di [Inventory Management](./Inventory%20Management.md)) — perlu diputuskan/ditambah saat build.
- Forgot-password flow belum ada di prototipe Login.

## Peta cepat

- [Information Architecture](./Information%20Architecture.md) — semua layar & rute
- [Design System](./Design%20System%20Overview.md) — visual & spacing
- [Data Model / ERD](./Entity%20Relationship%20Diagram.md)
- [Tech Stack](./Tech%20Stack.md)
