# Tech Stack — PPIT Nanjing

> Bagian dari [PPIT Nanjing MOC](./README.md). **Update:** stack database difinalkan ke **Neon Postgres** (keputusan konkret, project Neon sudah dibuat di region `ap-southeast-1`/Singapore) menggantikan rekomendasi awal Supabase. Rekomendasi lain di bawah menyesuaikan.

## ⚠️ Pertimbangan paling penting: pengguna berada di Tiongkok daratan

PPIT Nanjing dipakai oleh mahasiswa yang **secara fisik berada di balik Great Firewall**. Beberapa hal yang berisiko lambat/gagal total di sana kalau dibawa apa adanya ke produksi:

- **Google Fonts CDN** (`fonts.googleapis.com`) — dipakai di semua prototipe untuk Inter + Material Symbols.
- **Firebase Storage** — beberapa URL gambar referensi di aset prototipe mengarah ke `firebasestorage.googleapis.com`.
- **CDN global standar** (Vercel Edge Network default, Cloudflare) — cakupan point-of-presence terbatas di dalam Tiongkok tanpa lisensi ICP.

✅ **Kabar baik**: project Neon yang dipakai ada di region **`ap-southeast-1` (Singapore)** — jauh lebih dekat secara jaringan ke Nanjing dibanding region default US yang biasa dipakai provider database gratisan. Latensi query DB dari sisi Tiongkok akan lebih baik daripada skenario "asal pilih region US".

**Implikasi keputusan stack di bawah tetap berlaku:**
1. Font **wajib di-self-host** (`.woff2` dibundle, bukan `<link>` ke Google Fonts).
2. Ikon pakai **Lucide React** (bundled), bukan Material Symbols via CDN.
3. Storage gambar/file lewat **Vercel Blob** (lihat di bawah), bukan Firebase.
4. Performa Vercel Edge Network untuk pengguna di Tiongkok tetap jadi trade-off jangka panjang — payload sekecil mungkin adalah mitigasi utama untuk versi demo/awal ini.

## Rekomendasi Stack (final)

| Layer | Pilihan | Alasan |
|---|---|---|
| **Frontend framework** | **Next.js 15 (App Router) + TypeScript** | SSG untuk halaman publik, Server Components mengurangi JS ke browser. |
| **Styling** | **Tailwind CSS** | Prototipe sudah 100% Tailwind — migrasi ke kode produksi nyaris copy-paste. Token dari [Design System](./Design%20System%20Overview.md) dipetakan ke `tailwind.config`. |
| **UI primitives** | **shadcn/ui (Radix UI)** | Accessible out of the box, penting untuk form panjang & tabel admin console. |
| **Database** | **Neon (Serverless Postgres)** — `ap-southeast-1` | Postgres penuh (cocok untuk ERD relasional di [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md)), serverless (idle = $0), **database branching per-preview-deployment** — tiap PR Vercel bisa dapat cabang DB sendiri otomatis, sangat pas untuk fase demo yang sering iterasi. |
| **ORM** | **Drizzle ORM** + `@neondatabase/serverless` driver | TypeScript-first, lebih ringan dari Prisma (tidak ada query-engine binary terpisah), didesain untuk driver serverless Neon lewat HTTP/WebSocket — cocok untuk Vercel Edge/serverless functions. |
| **Auth** | **Auth.js (NextAuth v5)** dengan Google Provider | Gratis, self-hosted (tidak nambah vendor/biaya bulanan), langsung cocok dengan layar *Login with Google* yang sudah diprototipe. Session disimpan di Neon lewat Drizzle adapter. |
| **File Storage** | **Vercel Blob** | Terintegrasi native dengan hosting Vercel, setup minimal untuk demo. *(Opsi migrasi nanti: Cloudflare R2 — lebih murah di skala besar, saat pindah dari Vercel.)* |
| **Hosting / Deploy** | **Vercel** | Untuk fase **demo** sesuai arahan — auto-deploy dari git, preview per branch. Rencana jangka panjang: pindah backend/hosting ke provider berbayar lain saat sudah keluar fase demo (dicatat eksplisit sebagai keputusan sementara, bukan final). |
| **Form & validasi** | **React Hook Form + Zod** | Form panjang bertahap (Sensus Profile, Borrow Request, Job Application, Event Registration). |
| **Data fetching (client)** | **TanStack Query** | State admin console yang butuh refetch/optimistic update. |
| **Ikon** | **Lucide React** | Bundled, bukan font CDN eksternal. |
| **Font** | **Inter, self-hosted** via `next/font/local` | Zero request eksternal ke Google Fonts. |
| **QR code** | **`qrcode` / `qrcode.react`** | Tiket event digital, di-generate di server. |
| **Chart / laporan admin** | **Tremor atau Recharts** | Sensus Summary, Attendance Report, Inventory Audit. |
| **i18n** | **next-intl** | Konten campuran Indonesia/Inggris di prototipe. |

## Kenapa Neon dan bukan Supabase (revisi keputusan)

Rekomendasi awal adalah Supabase karena satu platform mencakup DB+Auth+Storage sekaligus. Setelah keputusan konkret memakai Neon (project sudah dibuat), trade-off-nya:

- **Kehilangan**: bundling otomatis Auth+Storage+RLS-dashboard dari Supabase — digantikan Auth.js + Vercel Blob secara terpisah (lebih banyak potongan yang perlu disatukan sendiri, tapi masing-masing tetap ringan).
- **Didapat**: Neon **database branching** yang terintegrasi rapi dengan alur preview-deployment Vercel (tiap branch git bisa punya salinan DB sendiri, sangat cocok untuk fase demo/iterasi cepat yang disebut user), region Singapore yang lebih dekat ke Tiongkok, dan model harga serverless-idle yang cocok untuk fase "demo dulu, belum bayar mahal."
- **Row Level Security** tetap bisa dipakai (Neon = Postgres asli, RLS native tersedia) tapi tidak ada dashboard visual Supabase untuk itu — kontrol akses per-role (lihat [Data Dictionary](./Data%20Dictionary.md) § ROLE/PERMISSION) diimplementasikan di application layer (Next.js middleware + query-level filtering lewat Drizzle), bukan RLS Postgres, untuk kesederhanaan.

## Status implementasi

- ✅ Project Neon dibuat (`ap-southeast-1`).
- 🔄 Scaffold Next.js + Drizzle + skema awal — sedang dikerjakan.
- ⏳ Deploy demo ke Vercel.
- ⏳ Migrasi hosting permanen (pasca-demo) — belum diputuskan, akan didiskusikan lagi setelah demo berjalan.

## Terkait

- [Entity Relationship Diagram](./Entity%20Relationship%20Diagram.md) — skema yang dipetakan ke Drizzle
- [Design System Overview](./Design%20System%20Overview.md) — token yang dipetakan ke `tailwind.config`
- [Information Architecture](./Information%20Architecture.md)
