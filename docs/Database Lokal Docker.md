# Database Lokal Docker

> Dibuat 2026-10-10. Cara menjalankan website ini di mesin sendiri dengan Postgres di dalam Docker: tanpa menyentuh Neon produksi, dan dengan database yang boleh dihapus kapan saja.
>
> Asalnya dari pengujian guidebook maba (#65). Migrasi `drizzle/0046_guidebook.sql` perlu dijalankan berkali-kali sambil diperiksa dengan `psql`, dan itu tidak bisa dilakukan ke Neon.

## Kenapa perlu database sendiri

`DATABASE_URL` produksi memakai endpoint pooled Neon, yang cuma bicara HTTP. `psql` dan `drizzle-kit` tidak bisa menyambung ke sana. Akibatnya, selama memakai Neon:

- Hasil migrasi tidak bisa diperiksa langsung (`\d guide_chunks`, hitung baris, cek kolom generated).
- `drizzle-kit push` berjalan ke database sungguhan, dan **`push` menerapkan pernyataan tanpa bertanya kalau stdin bukan terminal** — sekali dijalankan lewat pipe atau `< /dev/null`, tidak ada layar konfirmasi yang muncul.

Karena itu `src/db/index.ts` punya dua driver. `DB_DRIVER=pg` memakai `node-postgres`; tanpa variabel itu, tetap `neon-http` seperti produksi. Paket `pg` cuma devDependency dan dimuat lewat `createRequire` supaya tidak ikut terbundel ke fungsi produksi.

## Yang sedang jalan di mesin ini

| | |
|---|---|
| Container | `ppit-uji-db-...` (deploy Dokploy, image `postgres:16-alpine`) |
| Host port | `55432` |
| User & database | `ppit` / `ppit` |
| Password | ada di `.env.local` mesin ini, dan di Dokploy (project `ppit-uji`) |

`docker ps | grep ppit` untuk melihatnya. Isi `DATABASE_URL` yang cocok:

```
postgresql://ppit:<password>@127.0.0.1:55432/ppit
```

## Kalau bikin sendiri tanpa Dokploy

`docker-compose.yml` di root repo ini (port `5432`, password `ppit`):

```bash
docker compose up -d          # tunggu sampai statusnya (healthy), sekitar 7 detik
docker compose exec db psql -U ppit -d ppit
```

Database-nya tersimpan di volume `ppit-lokal`, jadi `docker compose down` tidak menghapus data. `down -v` menghapusnya.

## `.env.local`

Next membaca `.env` dulu, lalu `.env.local` menimpanya. Kunci yang tidak ditulis ulang di `.env.local` tetap terisi dari `.env` — dan itu nilai produksi. Jadi setiap kunci yang menyangkut database dan login harus ada di `.env.local`:

| Kunci | Nilai lokal | Kenapa |
|---|---|---|
| `DATABASE_URL` | `postgresql://ppit:<password>@127.0.0.1:55432/ppit` | Menunjuk container, bukan Neon |
| `DB_DRIVER` | `pg` | Tanpa ini, aplikasi mencoba HTTP Neon ke Postgres biasa dan gagal |
| `AUTH_SECRET` | nilai mana pun yang tetap | Boleh `npx auth secret` baru; cookie login lama jadi tidak valid |
| `AUTH_URL` | `http://localhost:3100` | Harus sama dengan port dev server |
| `AUTH_TRUST_HOST` | `true` | Next jalan di port non-standar |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | salin dari `.env` | Login Google |

Variabel shell menang atas `--env-file`. Jadi `DATABASE_URL=... npx tsx src/db/seed.ts` memakai nilai yang di-export, bukan yang ada di berkas.

## Menyalakan dari nol

1. `docker compose up -d` (atau pakai container Dokploy yang sudah jalan)
2. `npm install`
3. Buat `.env.local` seperti tabel di atas, dan `.env` untuk sisa variabelnya
4. Bentuk skema: `npx drizzle-kit push` — **baca daftar pernyataan yang dicetak lebih dulu**, lalu jawab Yes
5. `npx tsx --env-file=.env.local src/db/apply-sql.ts drizzle/0046_guidebook.sql`
6. `npx tsx --env-file=.env.local src/db/seed.ts`
7. `npx tsx --env-file=.env.local src/db/seed-local-admin.ts admin@ppit-local.test 'pilih-password-sendiri'`
8. `npm run dev -- -p 3100`

Port 3000 tidak dipakai karena di mesin ini sudah dipegang traefik milik Dokploy.

Langkah 4 dan 5 diuji di database kosong: `push` membentuk 70 tabel lengkap dengan `guide_chunks.tsv` sebagai kolom generated, lalu `0046_guidebook.sql` jalan tanpa error (semua pernyataannya `IF NOT EXISTS`, jadi aman diulang dan aman dijalankan setelah `push`). Jumlah tabel, kolom, dan indeksnya sama dengan database lokal yang sudah dipakai.

## Yang perlu diwaspadai

- `drizzle-kit push` ke database lokal yang sudah ada selalu melaporkan sekitar enam pernyataan: nama foreign key yang dipendekkan jadi 63 karakter dan `SET DEFAULT '{}'` di `departments.admin_module_scope` serta `event_divisions.granted_capabilities`. Itu drift lama, bukan dari guidebook. Setuju saja saat mengerjakan lokal.
- Kolom `guide_chunks.tsv` itu generated column. Ekspresinya ditulis di dua tempat, `src/db/schema.ts` dan `drizzle/0046_guidebook.sql`, dan keduanya harus sama persis. Kalau tidak, `push` terus menganggap kolomnya berubah.
- Jangan pernah meng-export `DATABASE_URL` Neon saat menjalankan `push`.
- `npm run db:seed` membaca `.env`, bukan `.env.local`. Untuk database lokal, jalankan langsung seperti langkah 6 di atas.

## Cara memeriksa hasilnya

- Skema: `docker compose exec db psql -U ppit -d ppit -c "\d guide_chunks"` — kolom `tsv` harus muncul sebagai `tsvector` dengan `generated`.
- Login: buka `http://localhost:3100/login`, pakai email dan password dari `seed-local-admin.ts`. Login Google lokal cuma jalan kalau `http://localhost:3100/api/auth/callback/google` terdaftar di OAuth client.
- Halaman console bisa diuji tanpa klik manual. Image `mcr.microsoft.com/playwright` hanya berisi browser-nya, tidak berisi paketnya, jadi pasang dulu `playwright-core` dengan revisi yang cocok: image itu memuat `chromium-1129`, dan itu revisi milik `playwright-core@1.46.0` (`node -e "console.log(require('playwright-core/browsers.json').browsers.find(b => b.name === 'chromium').revision)"` untuk memastikan).

  ```
  mkdir -p /tmp/uji && cd /tmp/uji
  docker run --rm -v /tmp/uji:/work -w /work mcr.microsoft.com/playwright:latest npm i playwright-core@1.46.0
  docker run --rm --network host -v /tmp/uji:/work -w /work -e BASE=http://localhost:3100 mcr.microsoft.com/playwright:latest node cek.mjs
  ```

  Skripnya login lewat `/login`, lalu membuka `/console/docs/guidebook` atau satu topik dan mencetak satu baris `[ok]`/`[!!]` per pemeriksaan. Tulis `import("playwright-core")`, bukan `import("playwright")`.

## Lihat juga

- [Setup Env & Migrasi Akun](./Setup%20Env%20&%20Migrasi%20Akun.md)
- [Guidebook Maba](./Guidebook%20Maba.md)
