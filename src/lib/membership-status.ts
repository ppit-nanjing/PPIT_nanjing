// Status keanggotaan seseorang di mata PPIT Nanjing.
//
// SENGAJA TIDAK ADA KOLOM `account_type` di tabel users. Status ini DITURUNKAN
// dari data yang sudah ada (sensus + cabang), karena kolom tipe akan langsung
// berselisih dengan sensus: orang mengisi sensus belakangan, atau pindah
// cabang, lalu yang benar yang mana — kolomnya atau `branch`-nya? Yang berubah
// bukan orangnya, tapi seberapa banyak yang kita tahu tentang dia. Itu keadaan
// data, bukan tipe akun.
//
// Label "non-Nanjinger" juga sengaja tidak dipakai: kalau `branch = "Shanghai"`,
// menulis "non-Nanjinger" justru membuang informasi yang sudah kita punya.

// Cabang PPI Tiongkok yang kita naungi. Satu nilai, bukan daftar 9 kota:
// mahasiswa di Zhenjiang/Xuzhou/Ma'anshan dst. tetap memilih cabang "Nanjing"
// di form sensus — 9 kota itu wilayah cakupan (lihat coverage_cities), bukan
// cabang tersendiri di direktori nasional.
export const HOME_BRANCH = "Nanjing";

// Nilai khusus untuk peserta acara yang bukan mahasiswa Indonesia di Tiongkok
// (alumni, teman lokal, tamu undangan) — mereka tidak punya cabang, dan itu
// jawaban yang sah, bukan data yang hilang.
export const NON_STUDENT_BRANCH = "Bukan mahasiswa di Tiongkok";

export type MembershipStatus =
  // Sensus lengkap, cabang Nanjing — anggota terverifikasi.
  | "anggota"
  // Sensus lengkap, cabang lain — mahasiswa Indonesia di Tiongkok, tapi
  // rekapnya jatah cabang mereka, bukan kita.
  | "cabang_lain"
  // Belum/tidak lengkap mengisi sensus — identitasnya belum terverifikasi.
  // Bisa Nanjinger yang belum sempat isi, bisa orang luar; dari sensus saja
  // keduanya tidak bisa dibedakan (lihat `branch` di event_registrations).
  | "tamu";

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  anggota: "Anggota (Nanjing)",
  cabang_lain: "Cabang lain",
  tamu: "Tamu",
};

export function membershipStatus(
  profile: { branch: string | null; completionStatus: string } | null | undefined
): MembershipStatus {
  if (!profile || profile.completionStatus !== "complete") return "tamu";
  return profile.branch === HOME_BRANCH ? "anggota" : "cabang_lain";
}

// Cabang yang kita ketahui tentang seseorang, dari sumber paling tepercaya
// lebih dulu: sensus lengkap (terverifikasi, dipakai untuk rekap pusat)
// mengalahkan jawaban sekali-pakai di form pendaftaran acara.
export function effectiveBranch(
  sensusBranch: string | null | undefined,
  registrationBranch: string | null | undefined
): string | null {
  return sensusBranch?.trim() || registrationBranch?.trim() || null;
}
