// Jam dinding Tiongkok (Asia/Shanghai, UTC+8, tanpa DST). Pengurus dan panitia
// semuanya di Tiongkok, tapi fungsi Vercel berjalan di UTC, jadi `new Date(value)`
// di server membaca jam yang diketik sebagai UTC (meleset 8 jam di produksi, tidak
// meleset di laptop pengembang yang zonanya CST). Semua input datetime-local
// dibaca dan ditulis lewat dua fungsi di bawah, dan semua tampilan jam memakai
// timeZone "Asia/Shanghai". Jangan pakai `new Date(value)` untuk nilai form.
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

/** False bila jam Tiongkoknya tepat 00.00: begitulah acara tanpa jam tersimpan, dan jamnya tidak ditampilkan. */
export function hasChinaClockTime(date: Date): boolean {
  return (date.getTime() + CHINA_OFFSET_MS) % 86_400_000 >= 60_000;
}

// ---- Ekspor Excel/CSV ----
// Semua file ekspor memakai jam Tiongkok (CST, UTC+8): pengurus dan peserta
// berada di Tiongkok, dan fungsi Vercel berjalan di UTC, jadi tanpa ini jam di
// file mundur 8 jam. Excel tidak punya zona waktu, jadi zonanya harus tertulis
// di kepala kolom (CHINA_TZ_LABEL).
export const CHINA_TIME_ZONE = "Asia/Shanghai";
export const CHINA_TZ_LABEL = "jam Tiongkok CST, UTC+8";

/** Kepala kolom waktu di ekspor dan tabel: zonanya ikut tertulis. */
export function timeHeader(header: string): string {
  return `${header} (${CHINA_TZ_LABEL})`;
}

/** "2026-10-25 16:10" dalam jam Tiongkok. Aman dibaca Excel dan urutan teksnya = urutan waktu. */
export function formatChinaDateTimeIso(date: Date): string {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

/** "2026-10-25" tanggal kalender Tiongkok (dipakai di nama file). */
export function formatChinaDateIso(date: Date): string {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Date yang bagian UTC-nya sama dengan jam dinding Tiongkok. Untuk menulis sel
 * tanggal Excel: ExcelJS menyimpan serial berbasis UTC dan Excel menampilkannya
 * apa adanya, jadi jam China harus "dipalsukan" sebagai UTC.
 */
export function toChinaWallClock(date: Date): Date {
  return new Date(date.getTime() + CHINA_OFFSET_MS);
}
