// Aturan tautan berkas sertifikat dan pembacaan daftar tempel massal. Fungsi murni
// (tanpa db/auth) supaya aksi server dan tampilan memakai aturan yang sama.
//
// Sertifikat TIDAK BOLEH terbit tanpa tautan berkas. Tautan itu ditampilkan sebagai
// <a href> di profil penerima, jadi hanya https:// yang diterima (bukan javascript:,
// data:, atau http polos).

export const CERT_URL_MAX = 2000;

/** Tautan https yang valid (dinormalkan), atau null bila kosong/tidak valid. */
export function normalizeCertificateUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > CERT_URL_MAX) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/** Kunci pencocokan nama/email: huruf kecil, spasi dirapatkan. */
export function personKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CertificateBulkEntry = { line: number; key: string; url: string };

/**
 * Daftar tempel massal: satu orang per baris, "email ATAU nama lengkap" lalu tautan,
 * dipisah tab, koma, titik koma, atau spasi. Contoh:
 *   budi@mail.com   https://contoh.com/sertifikat/budi.pdf
 *   Siti Aminah, https://contoh.com/sertifikat/siti.pdf
 * Baris yang tidak bisa dibaca dikembalikan di `problems` (dengan nomor barisnya),
 * bukan dibuang diam-diam.
 */
export function parseCertificateBulk(text: string): { entries: CertificateBulkEntry[]; problems: string[] } {
  const entries: CertificateBulkEntry[] = [];
  const problems: string[] = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const number = index + 1;
    const match = /https?:\/\/\S+/i.exec(line);
    if (!match) {
      problems.push(`Baris ${number}: tidak ada tautan (https://…)`);
      return;
    }
    const url = normalizeCertificateUrl(match[0]);
    if (!url) {
      problems.push(`Baris ${number}: tautan harus https:// yang valid`);
      return;
    }
    // Nama/email bisa di depan atau (jarang) di belakang tautannya.
    const before = line.slice(0, match.index);
    const after = line.slice(match.index + match[0].length);
    const key = (before || after).replace(/^[\s,;|\t]+|[\s,;|\t]+$/g, "");
    if (!key) {
      problems.push(`Baris ${number}: tidak ada nama atau email`);
      return;
    }
    entries.push({ line: number, key, url });
  });
  return { entries, problems };
}
