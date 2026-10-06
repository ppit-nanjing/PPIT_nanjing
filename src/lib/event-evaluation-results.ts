// Rekap jawaban evaluasi untuk acara dengan pertanyaan buatan panitia. Fungsi
// murni (tanpa db/auth) dipakai bersama oleh tampilan hasil di konsol dan ekspor
// CSV/Excel, supaya keduanya membaca jawaban dengan cara yang sama.
import {
  type EvalQuestionRow,
  type EvalQuestionType,
  isEvalQuestionType,
  splitOptions,
} from "@/lib/event-evaluation-questions";

export type EvalAnswerRow = {
  evaluationId: string;
  questionId: string | null;
  questionLabel: string;
  questionType: string;
  valueText: string | null;
  valueNumber: number | null;
};

/** Satu kolom rekap: pertanyaan yang masih ada, atau pertanyaan yang sudah dihapus tapi jawabannya masih tersimpan. */
export type EvalColumn = {
  key: string;
  label: string;
  type: EvalQuestionType;
  options: string[];
  removed: boolean;
};

export function answerKey(a: Pick<EvalAnswerRow, "questionId" | "questionLabel">): string {
  return a.questionId ?? `removed:${a.questionLabel}`;
}

/** Pertanyaan saat ini (urut), lalu pertanyaan yang sudah dihapus namun punya jawaban (dari salinan label/tipe). */
export function evalColumns(questions: EvalQuestionRow[], answers: EvalAnswerRow[]): EvalColumn[] {
  const columns: EvalColumn[] = questions.map((q) => ({
    key: q.id,
    label: q.label,
    type: q.type,
    options: splitOptions(q.options),
    removed: false,
  }));
  const seen = new Set(columns.map((c) => c.key));
  for (const a of answers) {
    const key = answerKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    columns.push({
      key,
      label: a.questionLabel,
      type: isEvalQuestionType(a.questionType) ? a.questionType : "text",
      options: [],
      removed: true,
    });
  }
  return columns;
}

/** evaluationId -> (kolom -> jawaban). */
export function answersByEvaluation(answers: EvalAnswerRow[]): Map<string, Map<string, EvalAnswerRow>> {
  const byEvaluation = new Map<string, Map<string, EvalAnswerRow>>();
  for (const a of answers) {
    let inner = byEvaluation.get(a.evaluationId);
    if (!inner) {
      inner = new Map();
      byEvaluation.set(a.evaluationId, inner);
    }
    inner.set(answerKey(a), a);
  }
  return byEvaluation;
}

/** Nilai jawaban sebagai teks (untuk daftar respons dan ekspor). Multi-pilihan digabung ", ". */
export function formatAnswer(a: EvalAnswerRow | undefined): string {
  if (!a) return "";
  if (a.valueNumber != null) return String(a.valueNumber);
  return (a.valueText ?? "").split("\n").join(", ");
}

/** Rating 1-10 untuk satu kolom, dari semua respons. */
export function ratingValues(column: EvalColumn, byEvaluation: Map<string, Map<string, EvalAnswerRow>>): number[] {
  const values: number[] = [];
  for (const inner of byEvaluation.values()) {
    const n = inner.get(column.key)?.valueNumber;
    if (n != null) values.push(n);
  }
  return values;
}

/**
 * Hitungan per pilihan untuk kolom select/radio/multiselect. Urutannya mengikuti
 * opsi saat ini; nilai di luar opsi (opsi yang diedit/dihapus belakangan) ditaruh di belakang.
 */
export function choiceCounts(
  column: EvalColumn,
  byEvaluation: Map<string, Map<string, EvalAnswerRow>>,
): { option: string; count: number }[] {
  const counts = new Map<string, number>(column.options.map((o) => [o, 0]));
  for (const inner of byEvaluation.values()) {
    const text = inner.get(column.key)?.valueText;
    if (!text) continue;
    for (const value of text.split("\n")) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([option, count]) => ({ option, count }));
}

export function isChoiceType(type: EvalQuestionType): boolean {
  return type === "select" || type === "radio" || type === "multiselect";
}
