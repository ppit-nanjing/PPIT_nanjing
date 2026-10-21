// Deteksi salah ketik domain email yang SUDAH PASTI salah (mis. "gmail.con").
// Dipakai di pendaftaran akun, email aktif sensus, dan edit email oleh admin -
// satu sumber untuk server dan klien, jadi tidak ada versi yang berselisih.
//
// Sengaja daftar eksplisit + satu aturan TLD, BUKAN jarak-edit ke domain
// populer: jarak-edit menandai domain asli ("mail.com" berjarak 1 dari
// "gmail.com", "126.com" dari "163.com"). Semua yang ada di sini tidak mungkin
// alamat yang benar, jadi aman diblok. Akibat salah ketik begini nyata: email
// tidak pernah sampai (reset password, notifikasi) dan orangnya membuat akun
// kedua dengan email yang benar, lalu bentrok di nomor paspor sensus.

// "<salah>" -> "<benar>", domain saja, huruf kecil.
const DOMAIN_FIXES: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.vom": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.comn": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclould.com": "icloud.com",
  "icloud.con": "icloud.com",
};

// ".con" dst. bukan TLD yang ada; hampir pasti ".com" yang salah ketik, di
// domain apa pun (kampus, kantor).
const TLD_TYPOS = new Set(["con", "cmo", "ocm", "vom", "xom", "comm", "coom"]);

/**
 * Alamat yang sudah dibetulkan kalau domainnya jelas salah ketik; null kalau
 * tidak ada masalah (atau bentuknya terlalu rusak untuk ditebak).
 */
export function suggestEmailFix(email: string): string | null {
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  const fixed = DOMAIN_FIXES[domain];
  if (fixed) return `${local}@${fixed}`;

  const dot = domain.lastIndexOf(".");
  if (dot > 0 && TLD_TYPOS.has(domain.slice(dot + 1))) {
    return `${local}@${domain.slice(0, dot)}.com`;
  }
  return null;
}
