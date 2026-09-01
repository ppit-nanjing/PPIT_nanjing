// Bentuk & aturan validasi form Sensus, disamakan field-per-field dengan form
// Sensus PPI Tiongkok pusat.
//
// Kenapa di lib, bukan di src/app/actions/sensus.ts: berkas itu "use server",
// jadi hanya boleh mengekspor fungsi async — konstanta dan tipe tidak bisa
// tinggal di sana. Menaruhnya di sini bikin wizard (client) dan server action
// memakai aturan yang PERSIS sama, sehingga tidak ada data yang lolos di server
// padahal ditolak di layar, atau sebaliknya.

export interface SensusInput {
  // BIODATA
  fullName: string;
  passportNumber: string;
  gender: string;
  passportExpiry: string;
  province: string;
  birthDate: string;
  // DATA MAHASISWA
  branch: string;
  studentStatus: string;
  university: string;
  degreeLevel: string;
  major: string;
  fundingSource: string;
  entryYear: string;
  graduationYear: string;
  // KONTAK
  wechatId: string;
  phoneActive: string;
  whatsappNumber: string;
  // Dokumen & persetujuan
  studentCardUrl: string;
  agreeTerms: boolean;
  subscribeNewsletter: boolean;
}

// Opsi dropdown. Nilai yang DISIMPAN selalu string Indonesia di bawah ini —
// itu bentuk yang direkap ke pusat; terjemahan hanya untuk label di layar
// (lihat OPTION_KEYS di sensus-wizard.tsx).
export const GENDER_OPTIONS = ["Laki-Laki", "Perempuan"];
export const STUDENT_STATUS_OPTIONS = ["Mahasiswa Aktif", "Mahasiswa Non-Aktif", "Cuti", "Lulus"];
export const DEGREE_OPTIONS = ["D3", "S1", "S2", "S3", "Sekolah Bahasa", "Lainnya"];
export const FUNDING_OPTIONS = ["Self-funded", "Partial Scholarship", "Full Scholarship"];

// Opsi pelarian di dropdown universitas. Daftar kampus per cabang di
// `branch_universities` adalah daftar terbaik kita, bukan salinan resmi dropdown
// pusat (lihat catatan di src/db/seed-branch-universities.ts) — tanpa opsi ini,
// mahasiswa dari kampus yang belum terdaftar akan terkunci total dan tidak bisa
// menyelesaikan sensus sama sekali.
export const UNIVERSITY_OTHER = "Lainnya";

// Aturan WeChat ID persis seperti yang tertulis di form pusat: "6-20 karakter;
// boleh memakai huruf, angka, _, dan -."
export const WECHAT_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

export function isValidWechatId(value: string): boolean {
  return WECHAT_ID_PATTERN.test(value.trim());
}

// "Nomor Telepon Aktif (+86)" — nomor Tiongkok yang dipakai sehari-hari, jadi
// hanya +86 yang diterima (form pusat pun mengunci prefiksnya).
export function isValidChinaPhone(value: string): boolean {
  return /^\+86\d{8,13}$/.test(value.trim());
}

// WhatsApp boleh nomor Indonesia atau Tiongkok — banyak yang masih pakai nomor
// +62 lamanya untuk WhatsApp meski tinggal di Tiongkok.
export function isValidWhatsApp(value: string): boolean {
  return /^\+(62|86)\d{7,15}$/.test(value.trim());
}

export function isValidYear(value: string): boolean {
  const n = Number(value);
  return /^\d{4}$/.test(value.trim()) && n >= 1950 && n <= 2100;
}

// Field wajib per langkah wizard, urutannya sama dengan form pusat. Dipakai dua
// arah: wizard melompat ke langkah pertama yang belum lengkap, server action
// menolak submit yang masih bolong.
export const REQUIRED_BY_STEP: ReadonlyArray<ReadonlyArray<keyof SensusInput>> = [
  ["fullName", "passportNumber", "gender", "passportExpiry", "province", "birthDate"],
  [
    "branch",
    "studentStatus",
    "university",
    "degreeLevel",
    "major",
    "fundingSource",
    "entryYear",
    "graduationYear",
    "studentCardUrl",
  ],
  ["wechatId", "phoneActive", "whatsappNumber", "agreeTerms"],
];

export interface SensusIssue {
  field: keyof SensusInput;
  step: number;
  // "required" = kosong; sisanya = terisi tapi bentuknya salah.
  // "passportTaken" hanya bisa ditentukan server (perlu lihat baris lain di
  // database), jadi tidak pernah muncul dari validateSensus() di klien.
  kind: "required" | "wechat" | "phone" | "whatsapp" | "year" | "gradBeforeEntry" | "passportTaken" | "studentCard";
}

// Semua masalah sekaligus, bukan berhenti di yang pertama, supaya pengisi form
// tidak dikirim bolak-balik antar langkah satu error per kali.
export function validateSensus(input: SensusInput): SensusIssue[] {
  const issues: SensusIssue[] = [];

  REQUIRED_BY_STEP.forEach((fields, step) => {
    for (const field of fields) {
      const value = input[field];
      const empty = typeof value === "boolean" ? !value : !String(value ?? "").trim();
      if (empty) issues.push({ field, step, kind: "required" });
    }
  });

  const filled = (field: keyof SensusInput) => String(input[field] ?? "").trim().length > 0;

  // Kartu mahasiswa HARUS URL hasil unggah - blob publik atau route internal
  // /api/... Nilai seperti "file:///D:/..." (ter-drop dari file manager saat
  // unggahannya diam-diam gagal) lolos cek "kosong" tapi tak berguna buat
  // rekap ke pusat.
  if (filled("studentCardUrl") && !/^(https:\/\/|\/api\/)/i.test(input.studentCardUrl.trim())) {
    issues.push({ field: "studentCardUrl", step: 1, kind: "studentCard" });
  }

  if (filled("wechatId") && !isValidWechatId(input.wechatId)) {
    issues.push({ field: "wechatId", step: 2, kind: "wechat" });
  }
  if (filled("phoneActive") && !isValidChinaPhone(input.phoneActive)) {
    issues.push({ field: "phoneActive", step: 2, kind: "phone" });
  }
  if (filled("whatsappNumber") && !isValidWhatsApp(input.whatsappNumber)) {
    issues.push({ field: "whatsappNumber", step: 2, kind: "whatsapp" });
  }
  if (filled("entryYear") && !isValidYear(input.entryYear)) {
    issues.push({ field: "entryYear", step: 1, kind: "year" });
  }
  if (filled("graduationYear") && !isValidYear(input.graduationYear)) {
    issues.push({ field: "graduationYear", step: 1, kind: "year" });
  }
  if (
    isValidYear(input.entryYear ?? "") &&
    isValidYear(input.graduationYear ?? "") &&
    Number(input.graduationYear) < Number(input.entryYear)
  ) {
    issues.push({ field: "graduationYear", step: 1, kind: "gradBeforeEntry" });
  }

  return issues;
}
