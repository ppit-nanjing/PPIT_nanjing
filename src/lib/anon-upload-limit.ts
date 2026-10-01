import { list } from "@vercel/blob";

// Pembatas unggahan TANPA login ("borrow-doc": Pernyataan Peminjam dari peminjam
// pihak luar yang tidak punya akun). Tanpa ini siapa pun bisa menembak endpoint
// berulang-ulang dan menghabiskan kuota penyimpanan Blob. Dua lapis, tanpa tabel
// baru di database:
//
//  1. Per IP, di memori instance (upaya terbaik): meredam satu klien yang
//     menembak bertubi-tubi. Serverless membuat banyak instance dan memori tidak
//     dibagi, jadi ini hanya melambatkan, bukan jaminan.
//  2. Batas GLOBAL per jam yang dihitung dari berkas yang benar-benar ada di
//     store (waktu unggah ada di awal key: `borrow-doc/<Date.now()>-...`). Ini
//     lapis yang menjamin: penyimpanan yang bisa dihabiskan anonim dibatasi per jam.
//
// Harga yang dibayar: di bawah serangan, peminjam luar yang sah bisa kena batas
// global sampai jamnya lewat. Dipilih sengaja - peminjaman luar jarang (3 pengajuan
// sepanjang sejarah saat ini), sedangkan kuota yang habis memukul semua orang.
// Pengguna yang login tidak lewat sini.

const HOUR_MS = 60 * 60 * 1000;
const MAX_FILES_PER_HOUR = 20;
const MAX_BYTES_PER_HOUR = 100 * 1024 * 1024;

const PER_IP_MAX = 5;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  // Vercel menimpa x-forwarded-for / x-real-ip dengan IP sebenarnya.
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** true = IP ini sudah melewati batas; kalau belum, kunjungan ini dicatat. */
export function ipRateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW_MS);
  if (recent.length >= PER_IP_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Jaga agar map tak tumbuh tanpa batas di instance yang hidup lama.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= PER_IP_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

/** true = kuota global unggahan anonim jam ini sudah habis. */
export async function anonUploadQuotaExceeded(token: string, now = Date.now()): Promise<boolean> {
  let files = 0;
  let bytes = 0;
  let cursor: string | undefined;
  // Maks 5 halaman (5000 berkas) - jauh di atas jumlah sebenarnya; mencegah loop
  // panjang kalau folder suatu hari membengkak.
  for (let page = 0; page < 5; page++) {
    const res = await list({ prefix: "borrow-doc/", cursor, limit: 1000, token });
    for (const blob of res.blobs) {
      // Unggahan anonim: `borrow-doc/<ms>-nama`. Unggahan yang login punya segmen
      // userId lebih dulu (`borrow-doc/<uuid>/...`) sehingga tidak cocok pola ini.
      const m = blob.pathname.match(/^borrow-doc\/(\d{13})-/);
      if (m && now - Number(m[1]) < HOUR_MS) {
        files++;
        bytes += blob.size;
      }
    }
    if (!res.hasMore) break;
    cursor = res.cursor;
  }
  return files >= MAX_FILES_PER_HOUR || bytes >= MAX_BYTES_PER_HOUR;
}
