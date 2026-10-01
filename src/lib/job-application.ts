// Satu sumber untuk status lamaran kerja. Bukan di src/app/actions/jobs.ts
// karena berkas "use server" hanya boleh mengekspor fungsi async.

export const JOB_APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "interview",
  "offered",
  "rejected",
] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

// Kata-katanya sama dengan kamus i18n halaman pelamar (jobs.status.*) supaya
// pengurus dan pelamar membaca istilah yang sama.
export const JOB_APPLICATION_STATUS_LABEL: Record<JobApplicationStatus, string> = {
  submitted: "Terkirim",
  under_review: "Sedang direview",
  interview: "Tahap wawancara",
  offered: "Diterima",
  rejected: "Ditolak",
};

export function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return (JOB_APPLICATION_STATUSES as readonly string[]).includes(value);
}

// CV boleh berupa unggahan (https Blob) atau tautan Drive, tapi tidak pernah
// skema lain (data:, file:, javascript:, ...). Dicek di server sebelum disimpan
// dan lagi sebelum dirender sebagai tautan di console.
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// Tautan lamaran eksternal: https saja, tanpa kredensial tertanam, dan tidak
// kepanjangan. Tautan ini dipakai server untuk mengalihkan anggota ke luar.
export function isHttpsUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

export const JOB_TYPES = ["internship", "full_time", "part_time", "volunteer"] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  internship: "Magang",
  full_time: "Penuh waktu",
  part_time: "Paruh waktu",
  volunteer: "Sukarelawan",
};

export function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}
