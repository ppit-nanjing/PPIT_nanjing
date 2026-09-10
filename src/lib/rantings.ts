// Ranting = sub-cabang setingkat kampus di bawah PPIT Nanjing. Dua yang aktif:
// INA di NUIST, JIA di JSAHVC (lihat teks di src/app/about/page.tsx). Pengurus
// ranting ("[INA] BPH Ranting" / "[JIA] BPH Ranting") hanya boleh melihat
// ringkasan sensus mahasiswa KAMPUS-nya sendiri di /console/ranting/sensus —
// tidak ada akses ke sensus penuh, ekspor, atau modul lain.
//
// Pemetaan ranting -> kampus dibuat lewat nilai `university` yang tersimpan di
// sensus_profiles. Nilainya berasal dari dropdown per-cabang
// (src/db/seed-branch-universities.ts) — cocokkan persis (case-insensitive,
// di-trim). Mahasiswa yang memakai opsi bebas "Lainnya" tidak akan terhitung;
// itu keterbatasan yang diterima, bukan bug.

export const RANTINGS = {
  INA: {
    label: "INA · NUIST",
    // src/db/seed-branch-universities.ts:276
    universities: ["Nanjing University of Information Science and Technology"],
  },
  JIA: {
    label: "JIA · JSAHVC",
    // TODO: isi string `university` persis yang dipakai mahasiswa JSAHVC di
    // form sensus. Sampai diisi, halaman ranting JIA tampil kosong.
    universities: [] as string[],
  },
} as const;

export type RantingCode = keyof typeof RANTINGS;

export function isRantingCode(value: string | null | undefined): value is RantingCode {
  return value === "INA" || value === "JIA";
}

// Ambil kode ranting dari nama role ("[INA] BPH Ranting" -> "INA"). Nama role
// di-seed di src/db/seed.ts / drizzle/0034_ranting_roles.sql.
export function rantingCodeFromRoleName(roleName: string | null | undefined): RantingCode | null {
  const m = /^\[(INA|JIA)\]/.exec((roleName ?? "").trim());
  return m ? (m[1] as RantingCode) : null;
}

export function isRantingBphRole(roleName: string | null | undefined): boolean {
  return /^\[(INA|JIA)\]\s*BPH Ranting$/i.test((roleName ?? "").trim());
}

// Cocokkan nilai `university` sensus dengan daftar kampus sebuah ranting.
export function universityInRanting(university: string | null | undefined, code: RantingCode): boolean {
  const u = (university ?? "").trim().toLowerCase();
  if (!u) return false;
  return RANTINGS[code].universities.some((name) => name.toLowerCase() === u);
}
