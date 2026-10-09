import type { EvalQuestionRow } from "@/lib/event-evaluation-questions";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Evaluasi panitia PER-ACARA (kolektif) — definisi pertanyaan template & status
// jendela. Berkas ini sengaja MURNI (tanpa @/db atau @/auth) supaya boleh
// diimpor komponen klien, server, dan route handler.
//
// Sejak dibangun ulang di atas builder pertanyaan evaluasi (PR #74 + audience),
// pertanyaan panitia per-acara diatur BPH dari konsol (tabel
// event_evaluation_questions, audience = "panitia"). Definisi di berkas ini
// hanya TEMPLATE BAWAAN yang dipakai saat acara belum punya pertanyaan sendiri:
// lima penilaian kolektif Bintang 1–5 + dua teks wajib + satu opsional —
// sifatnya KOLEKTIF: menilai divisi/kepanitiaan secara keseluruhan, bukan skor
// per orang (keputusan BPH; apresiasi individu jalan lewat jalur lain).
// `label` versi Indonesia dipakai untuk isi DB/ekspor, `labelKey` untuk UI
// (diterjemahkan lewat kamus, pola sama dengan event-evaluation-template).

// ID pertanyaan template. Menjadi nama field form (`q_<id>`) DAN kunci
// validasi di server action — jangan diubah begitu ada jawaban tersimpan.
export const COMMITTEE_TEMPLATE_IDS = {
  coordination: "ceval-coordination",
  teamwork: "ceval-teamwork",
  communication: "ceval-communication",
  workload: "ceval-workload",
  satisfaction: "ceval-satisfaction",
  wentWell: "ceval-went-well",
  toImprove: "ceval-to-improve",
  feedback: "ceval-feedback",
} as const;

export type CommitteeEvalAspect = {
  id: string;
  labelKey: TKey;
  label: string;
  hintKey?: TKey;
};

export const COMMITTEE_EVAL_ASPECTS: CommitteeEvalAspect[] = [
  {
    id: COMMITTEE_TEMPLATE_IDS.coordination,
    labelKey: "ceval.qCoordination",
    label: "Koordinasi antar divisi selama acara",
    hintKey: "ceval.qCoordinationHint",
  },
  { id: COMMITTEE_TEMPLATE_IDS.teamwork, labelKey: "ceval.qTeamwork", label: "Kerja sama & suasana tim" },
  {
    id: COMMITTEE_TEMPLATE_IDS.communication,
    labelKey: "ceval.qCommunication",
    label: "Komunikasi informasi dari panitia inti / BPH",
  },
  { id: COMMITTEE_TEMPLATE_IDS.workload, labelKey: "ceval.qWorkload", label: "Pembagian tugas & beban kerja" },
  {
    id: COMMITTEE_TEMPLATE_IDS.satisfaction,
    labelKey: "ceval.qSatisfaction",
    label: "Kepuasanmu menjadi panitia acara ini",
  },
];

// Dua teks wajib + satu opsional — menjaga rekap selalu punya bahan
// kualitatif, bukan cuma angka.
export const COMMITTEE_EVAL_TEXT = {
  wentWell: { id: COMMITTEE_TEMPLATE_IDS.wentWell, labelKey: "ceval.wentWell", label: "Apa yang berjalan baik?", optional: false },
  toImprove: { id: COMMITTEE_TEMPLATE_IDS.toImprove, labelKey: "ceval.toImprove", label: "Apa yang perlu diperbaiki?", optional: false },
  feedback: {
    id: COMMITTEE_TEMPLATE_IDS.feedback,
    labelKey: "ceval.feedback",
    label: "Masukan tambahan untuk panitia acara berikutnya",
    optional: true,
  },
} as const;

/** Panjang maksimum jawaban teks panitia — dipakai validasi server & atribut form. */
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

/**
 * Pertanyaan template evaluasi panitia, dalam bentuk yang sama dengan baris DB
 * (EvalQuestionRow) supaya form publik, builder, dan server action memakai
 * satu bentuk data. Limanya Bintang 1–5, sisanya textarea. ID statis (bukan
 * uuid DB) — field form-nya `q_ceval-*`.
 */
export function committeeEvalTemplateQuestions(): EvalQuestionRow[] {
  return [
    ...COMMITTEE_EVAL_ASPECTS.map((a, i) => ({
      id: a.id,
      label: a.label,
      type: "stars" as const,
      options: null,
      required: true,
      orderIndex: i + 1,
    })),
    ...Object.values(COMMITTEE_EVAL_TEXT).map((q, i) => ({
      id: q.id,
      label: q.label,
      type: "textarea" as const,
      options: null,
      required: !q.optional,
      orderIndex: COMMITTEE_EVAL_ASPECTS.length + i + 1,
    })),
  ];
}
