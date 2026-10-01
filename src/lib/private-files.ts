// Dokumen pribadi yang diunggah lewat /api/upload (bukti transfer, CV, berkas
// peserta acara, Pernyataan Peminjam, lampiran form Join Us) disimpan di store
// Blob PRIVATE dan hanya dibaca lewat proxy ter-auth /api/files/[...pathname].
// Berkas ini TIDAK punya URL publik. File ini cuma konstanta + fungsi murni
// (tanpa @/auth / @/db) supaya aman diimpor dari komponen klien.
//
// (Kartu mahasiswa alur sensus punya proxy sendiri, /api/sensus/student-card -
// dibiarkan, karena URL-nya sudah tersimpan di banyak baris.)

export const PRIVATE_FILE_FOLDERS = [
  "payment-proof",
  "event-doc",
  "borrow-doc",
  "membership",
  "resume",
] as const;

export type PrivateFileFolder = (typeof PRIVATE_FILE_FOLDERS)[number];

export const PRIVATE_FILE_PREFIX = "/api/files/";

export function isPrivateFileFolder(value: string): value is PrivateFileFolder {
  return (PRIVATE_FILE_FOLDERS as readonly string[]).includes(value);
}

// Segmen key yang dihasilkan upload route (nama file sudah disanitasi, uuid,
// timestamp, suffix acak) - menutup `.`/`..` dan hasil dekode %2F / %2e.
export function isSafePathSegment(segment: string): boolean {
  return segment !== "." && segment !== ".." && /^[A-Za-z0-9._-]+$/.test(segment);
}

/** URL proxy untuk sebuah key blob (`payment-proof/<userId>/123-bukti-AbC.png`). */
export function privateFileUrl(pathname: string): string {
  return PRIVATE_FILE_PREFIX + pathname.split("/").map(encodeURIComponent).join("/");
}

/**
 * Key blob dari URL proxy, atau null kalau bukan URL proxy yang sah (segmen
 * aneh, folder di luar daftar, query string, dsb).
 */
export function pathnameFromPrivateFileUrl(url: string): string | null {
  if (!url.startsWith(PRIVATE_FILE_PREFIX)) return null;
  const segments = url.slice(PRIVATE_FILE_PREFIX.length).split("/");
  if (segments.length < 2 || !segments.every(isSafePathSegment)) return null;
  return isPrivateFileFolder(segments[0]) ? segments.join("/") : null;
}

/**
 * Apakah `url` berkas unggahan milik `userId` di folder ini? Upload route
 * menaruh berkas pengguna yang login di `<folder>/<userId>/...`, jadi server
 * action bisa menolak URL berkas orang lain yang ditempel ke form sendiri.
 */
export function isOwnPrivateFileUrl(url: string, folder: PrivateFileFolder, userId: string): boolean {
  return url.startsWith(`${PRIVATE_FILE_PREFIX}${folder}/${userId}/`) && pathnameFromPrivateFileUrl(url) !== null;
}
