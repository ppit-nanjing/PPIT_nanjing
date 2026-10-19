/**
 * Format a Date as a `datetime-local` input value (YYYY-MM-DDTHH:mm) in the
 * SERVER's local timezone.
 *
 * Why not `toISOString().slice(0, 16)`: that is UTC, so an event stored at
 * 19:00 WIB renders as 12:00 in the edit form - every save silently shifts
 * the stored time by the timezone offset. `datetime-local` values carry no
 * zone, so we must render wall-clock time; subtracting the offset first makes
 * toISOString() emit local wall clock. Server and browser run in the same
 * zone for console admins today; when that stops holding, move this to a
 * client component and drop the helper from server pages.
 */
export function toDateLocalInput(date: Date): string {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

// Jam dinding Tiongkok (Asia/Shanghai, UTC+8, tanpa DST). Pengurus dan panitia
// semuanya di Tiongkok, tapi fungsi Vercel berjalan di UTC, jadi pasangan
// toDateLocalInput + `new Date(value)` di server meleset 8 jam di produksi
// (dan tidak meleset di laptop pengembang yang zonanya CST). Dua fungsi di bawah
// tidak bergantung zona server: nilai datetime-local SELALU dibaca dan ditulis
// sebagai jam Tiongkok. Dipakai jendela evaluasi panitia; field acara lain masih
// memakai konvensi lama.
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Date → nilai `datetime-local` (YYYY-MM-DDTHH:mm) dalam jam Tiongkok. */
export function toChinaLocalInput(date: Date): string {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 16);
}

/** Nilai `datetime-local` yang diketik dalam jam Tiongkok → Date (UTC). Null bila kosong/tidak valid. */
export function parseChinaLocalInput(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = LOCAL_INPUT_RE.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0)) - CHINA_OFFSET_MS;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}
