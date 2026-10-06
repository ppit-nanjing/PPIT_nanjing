// Pertanyaan evaluasi buatan panitia: tipe dan validasi jawaban.
// Client-safe (tanpa import db/auth/kamus) supaya
// form publik, builder konsol, dan server action memakai definisi yang sama.

export const EVAL_QUESTION_TYPES = ["rating", "stars", "text", "textarea", "select", "radio", "multiselect"] as const;
export type EvalQuestionType = (typeof EVAL_QUESTION_TYPES)[number];

// Dua tipe berskala angka. Skalanya berbeda, jadi rekapnya tidak boleh dicampur.
export const SCALE_MAX = { rating: 10, stars: 5 } as const;
export type ScaleType = keyof typeof SCALE_MAX;

export function isScaleType(type: EvalQuestionType): type is ScaleType {
  return type === "rating" || type === "stars";
}

export const EVAL_QUESTION_TYPE_LABELS: Record<EvalQuestionType, string> = {
  rating: "Penilaian 1–10",
  stars: "Bintang 1–5",
  text: "Teks Pendek",
  textarea: "Teks Panjang",
  select: "Dropdown",
  radio: "Pilihan (radio)",
  multiselect: "Pilih Banyak (centang)",
};

export const EVAL_TEXT_MAX = 2000;
export const EVAL_SHORT_TEXT_MAX = 300;

/** Bentuk pertanyaan yang dikirim ke form publik dan builder (plain data, aman lintas batas RSC). */
export type EvalQuestionRow = {
  id: string;
  label: string;
  type: EvalQuestionType;
  options: string | null;
  required: boolean;
  orderIndex: number;
};

export function isEvalQuestionType(value: string): value is EvalQuestionType {
  return (EVAL_QUESTION_TYPES as readonly string[]).includes(value);
}

export function needsOptions(type: EvalQuestionType): boolean {
  return type === "select" || type === "radio" || type === "multiselect";
}

/** "a\nb\n\nc" -> ["a","b","c"] (opsi disimpan satu per baris). */
export function splitOptions(options: string | null | undefined): string[] {
  return (options ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export type EvalAnswerInput = { text: string | null; number: number | null };

/**
 * Validasi + normalisasi jawaban satu pertanyaan dari FormData. `values` adalah
 * semua nilai untuk field itu (multiselect bisa >1). Mengembalikan:
 *  - { ok: true, answer: null }   pertanyaan opsional yang dikosongkan
 *  - { ok: true, answer }         jawaban valid
 *  - { ok: false, reason }        "required" (wajib kosong) atau "invalid" (di luar aturan)
 */
export function validateEvalAnswer(
  q: Pick<EvalQuestionRow, "type" | "options" | "required">,
  values: FormDataEntryValue[],
): { ok: true; answer: EvalAnswerInput | null } | { ok: false; reason: "required" | "invalid" } {
  const strings = values.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  if (strings.length === 0) return q.required ? { ok: false, reason: "required" } : { ok: true, answer: null };

  if (isScaleType(q.type)) {
    const n = Number.parseInt(strings[0], 10);
    if (!Number.isInteger(n) || String(n) !== strings[0] || n < 1 || n > SCALE_MAX[q.type]) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, answer: { text: null, number: n } };
  }

  if (q.type === "text" || q.type === "textarea") {
    const max = q.type === "text" ? EVAL_SHORT_TEXT_MAX : EVAL_TEXT_MAX;
    if (strings[0].length > max) return { ok: false, reason: "invalid" };
    return { ok: true, answer: { text: strings[0], number: null } };
  }

  const allowed = new Set(splitOptions(q.options));
  if (q.type === "multiselect") {
    const unique = [...new Set(strings)];
    if (unique.some((v) => !allowed.has(v))) return { ok: false, reason: "invalid" };
    return { ok: true, answer: { text: unique.join("\n"), number: null } };
  }
  // select / radio: tepat satu opsi yang dikenal.
  if (strings.length !== 1 || !allowed.has(strings[0])) return { ok: false, reason: "invalid" };
  return { ok: true, answer: { text: strings[0], number: null } };
}
