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

// Sejak 2026-09-14, field "Asal Kota" di form sensus memakai 9 kota naungan
// PPIT Nanjing sendiri (coverage_cities), BUKAN lagi skala cabang nasional PPI
// Tiongkok yang cuma punya "Nanjing" untuk seluruh wilayah ini - lihat
// src/app/sensus/page.tsx. Sebelumnya dianggap "satu nilai, bukan daftar 9
// kota", jadi status keanggotaan di sini SEMPAT keliru: mahasiswa yang jujur
// memilih kota aslinya (mis. "Xuzhou") akan salah terhitung "cabang_lain"
// (dianggap bukan anggota kita) meski dia genap anggota PPIT Nanjing.
// HOME_BRANCH dipertahankan sebagai kota utama/label default (dipakai di
// filter laporan); pengecekan keanggotaan sekarang lewat HOME_BRANCHES + isHomeBranch().
export const HOME_BRANCH = "Nanjing";
// Duplikat 9 nilai coverage_cities.label secara sengaja (bukan query DB) -
// fungsi di berkas ini dipakai sinkron di banyak tempat (tally, map loop),
// dan daftarnya sudah dianggap stabil/jarang berubah di tempat lain juga
// (mis. CITIES di src/app/page.tsx). Update bersamaan kalau coverage_cities
// berubah.
export const HOME_BRANCHES = [
  "Nanjing",
  "Xuzhou",
  "Jurong",
  "Ma’anshan",
  "Zhenjiang",
  "Huai’an",
  "Lianyungang",
  "Taizhou",
  "Yancheng",
] as const;

export function isHomeBranch(branch: string | null | undefined): boolean {
  return !!branch && (HOME_BRANCHES as readonly string[]).includes(branch);
}

// Sentinel for the "Kota (Ringkasan Sensus)" report filter - a real city name
// can't represent "any of our 9 cities" by itself, so this stands in for that
// choice in the <select> value / query param. The route handler expands it to
// an `inArray(sensusProfiles.branch, HOME_BRANCHES)` condition.
export const HOME_BRANCH_FILTER = "__home__";

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
  anggota: "Anggota (PPIT Nanjing)",
  cabang_lain: "Cabang lain",
  tamu: "Tamu",
};

export function membershipStatus(
  profile: { branch: string | null; completionStatus: string } | null | undefined
): MembershipStatus {
  if (!profile || profile.completionStatus !== "complete") return "tamu";
  return isHomeBranch(profile.branch) ? "anggota" : "cabang_lain";
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
