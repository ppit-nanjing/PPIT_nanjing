// Dipisah dari src/lib/password-reset.ts supaya bisa diuji tanpa menyambung
// database - berkas itu mengimpor src/db di tingkat modul.
/**
 * Siapa yang boleh menerima tautan reset.
 *
 * Akun dengan password jelas boleh. Akun tanpa password (masuk lewat Google)
 * juga boleh SELAMA alamat emailnya sudah terbukti - Google yang menyatakan
 * `email_verified`, jadi tautan ke alamat itu benar sampai ke pemiliknya.
 * Inilah satu-satunya jalan bagi akun Google-only untuk memasang password.
 * Akun undangan tanpa password dan tanpa email terverifikasi tetap dilewati:
 * belum ada bukti apa pun bahwa alamat di baris itu milik orang yang meminta.
 */
export function canReceivePasswordReset(user: {
  passwordHash: string | null;
  emailVerified: Date | null;
}): boolean {
  return Boolean(user.passwordHash || user.emailVerified);
}
