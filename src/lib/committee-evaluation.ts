import type { TKey } from "@/lib/i18n/dictionaries/id";

// Evaluasi panitia PER-ACARA (kolektif) — satu-satunya sumber definisi
// pertanyaan & status jendela. Berkas ini sengaja MURNI (tanpa @/db atau
// @/auth) supaya boleh diimpor komponen klien, server, dan route handler.

// PLACEHOLDER — ganti di sini saat BPH menetapkan pertanyaan aslinya. Sifatnya
// KOLEKTIF: menilai divisi/kepanitiaan secara keseluruhan, bukan skor per
// orang (keputusan BPH; apresiasi individu jalan lewat jalur lain). `label`
// versi Indonesia dipakai untuk header ekspor CSV/Excel, `labelKey` untuk UI
// (diterjemahkan lewat kamus, pola sama dengan event-evaluation-template).
export type CommitteeEvalAspectField =
  | "ratingCoordination"
  | "ratingTeamwork"
  | "ratingCommunication"
  | "ratingWorkload"
  | "ratingSatisfaction";

export type CommitteeEvalAspect = {
  field: CommitteeEvalAspectField;
  labelKey: TKey;
  label: string;
  hintKey?: TKey;
};

export const COMMITTEE_EVAL_ASPECTS: CommitteeEvalAspect[] = [
  {
    field: "ratingCoordination",
    labelKey: "ceval.qCoordination",
    label: "Koordinasi antar divisi",
    hintKey: "ceval.qCoordinationHint",
  },
  { field: "ratingTeamwork", labelKey: "ceval.qTeamwork", label: "Kerja sama & suasana tim" },
  {
    field: "ratingCommunication",
    labelKey: "ceval.qCommunication",
    label: "Komunikasi informasi dari panitia inti / BPH",
  },
  { field: "ratingWorkload", labelKey: "ceval.qWorkload", label: "Pembagian tugas & beban kerja" },
  {
    field: "ratingSatisfaction",
    labelKey: "ceval.qSatisfaction",
    label: "Kepuasan menjadi panitia acara ini",
  },
];

// Dua teks wajib + satu opsional — menjaga rekap selalu punya bahan
// kualitatif, bukan cuma angka. Kolom DB-nya tetap: went_well, to_improve,
// feedback.
export const COMMITTEE_EVAL_TEXT = {
  wentWell: { name: "wentWell", labelKey: "ceval.wentWell", label: "Apa yang berjalan baik?", optional: false },
  toImprove: { name: "toImprove", labelKey: "ceval.toImprove", label: "Apa yang perlu diperbaiki?", optional: false },
  feedback: {
    name: "feedback",
    labelKey: "ceval.feedback",
    label: "Masukan tambahan untuk panitia acara berikutnya",
    optional: true,
  },
} as const;

// Batas angka penilaian & panjang teks — dipakai form klien dan aksi server
// supaya validasi keduanya tidak bisa saling geser.
export const COMMITTEE_EVAL_RATING_MIN = 1;
export const COMMITTEE_EVAL_RATING_MAX = 5;
export const COMMITTEE_EVAL_TEXT_MAX = 2000;

// Status jendela pengisian, dihitung dari waktu saat ini (tanpa cron):
// - "not-configured": BPH belum memasang jendela sama sekali
// - "before": jendela sudah dipasang tapi belum mulai
// - "open": boleh mengisi (opensAt boleh NULL = sudah dibuka, tutup manual)
// - "closed": lewat closesAt (closesAt NULL = tidak pernah menutup otomatis)
export type CommitteeEvalWindowState = "not-configured" | "before" | "open" | "closed";

export function committeeEvalWindowState(
  opensAt: Date | string | null,
  closesAt: Date | string | null,
  now: Date = new Date(),
): CommitteeEvalWindowState {
  if (!opensAt && !closesAt) return "not-configured";
  if (opensAt && now < new Date(opensAt)) return "before";
  if (closesAt && now > new Date(closesAt)) return "closed";
  return "open";
}

// Pintasan "buka 1 minggu setelah acara": mulai dari akhir acara (fallback
// waktu mulai), tutup +durationDays. Dipakai komponen konsol; murni supaya
// gampang diuji.
export function committeeEvalPresetWindow(
  eventEndsAt: Date | string | null,
  durationDays = 7,
): { opensAt: Date; closesAt: Date } {
  const base = eventEndsAt ? new Date(eventEndsAt) : new Date();
  return {
    opensAt: base,
    closesAt: new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000),
  };
}