import type { EvalQuestionRow } from "@/lib/event-evaluation-questions";

// Evaluasi panitia PER-ACARA (kolektif) — template pertanyaan & status jendela.
// Berkas ini sengaja MURNI (tanpa @/db atau @/auth) supaya boleh diimpor
// komponen klien, server, dan route handler.
//
// Pertanyaan panitia per-acara disimpan sebagai baris DB (event_evaluation_questions,
// audience = "panitia") dan disusun BPH di konsol. Template di bawah disalin ke DB
// saat jendela pengisian pertama kali disimpan (saveCommitteeEvaluationWindow),
// atau lewat "Mulai dari template" di builder; selain itu hanya dipakai untuk
// pratinjau. Sifatnya KOLEKTIF: menilai divisi/kepanitiaan secara keseluruhan,
// bukan skor per orang (keputusan BPH). Label disimpan apa adanya (bahasa
// Indonesia) karena konten DB tidak diterjemahkan otomatis.

// ID statis hanya untuk pratinjau (nama field `q_<id>`); setelah disalin ke DB,
// setiap pertanyaan memakai uuid barisnya sendiri.
const TEMPLATE_RATINGS: { id: string; label: string }[] = [
  { id: "ceval-coordination", label: "Koordinasi antar divisi selama acara" },
  { id: "ceval-teamwork", label: "Kerja sama & suasana tim" },
  { id: "ceval-communication", label: "Komunikasi informasi dari panitia inti / BPH" },
  { id: "ceval-workload", label: "Pembagian tugas & beban kerja" },
  { id: "ceval-satisfaction", label: "Kepuasanmu menjadi panitia acara ini" },
];

// Dua teks wajib + satu opsional — menjaga rekap selalu punya bahan
// kualitatif, bukan cuma angka.
const TEMPLATE_TEXTS: { id: string; label: string; required: boolean }[] = [
  { id: "ceval-went-well", label: "Apa yang berjalan baik?", required: true },
  { id: "ceval-to-improve", label: "Apa yang perlu diperbaiki?", required: true },
  { id: "ceval-feedback", label: "Masukan tambahan untuk panitia acara berikutnya", required: false },
];

/** Pertanyaan template evaluasi panitia dalam bentuk baris DB (EvalQuestionRow). Lima Bintang 1–5, sisanya textarea. */
export function committeeEvalTemplateQuestions(): EvalQuestionRow[] {
  return [
    ...TEMPLATE_RATINGS.map((q, i) => ({
      id: q.id,
      label: q.label,
      type: "stars" as const,
      options: null,
      required: true,
      orderIndex: i + 1,
    })),
    ...TEMPLATE_TEXTS.map((q, i) => ({
      id: q.id,
      label: q.label,
      type: "textarea" as const,
      options: null,
      required: q.required,
      orderIndex: TEMPLATE_RATINGS.length + i + 1,
    })),
  ];
}

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
