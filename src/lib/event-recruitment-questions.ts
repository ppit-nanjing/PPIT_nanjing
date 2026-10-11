// Pertanyaan rekrutmen panitia buatan BPH: tipe dan validasi jawaban.
// Client-safe (tanpa import db/auth/kamus) supaya
// form publik, builder konsol, dan server action memakai definisi yang sama.

export const RECRUIT_QUESTION_TYPES = ["text", "textarea", "select", "radio", "multiselect"] as const;
export type RecruitQuestionType = (typeof RECRUIT_QUESTION_TYPES)[number];

export const RECRUIT_QUESTION_TYPE_LABELS: Record<RecruitQuestionType, string> = {
  text: "Teks Pendek",
  textarea: "Teks Panjang",
  select: "Dropdown",
  radio: "Pilihan (radio)",
  multiselect: "Pilih Banyak (centang)",
};

export const RECRUIT_TEXT_MAX = 2000;
export const RECRUIT_SHORT_TEXT_MAX = 300;

export type RecruitFormState = {
  ok?: boolean;
  already?: boolean;
  error?: string;
};

export type RecruitQuestionRow = {
  id: string;
  label: string;
  type: RecruitQuestionType;
  options: string | null;
  required: boolean;
  orderIndex: number;
};

export function isRecruitQuestionType(value: string): value is RecruitQuestionType {
  return (RECRUIT_QUESTION_TYPES as readonly string[]).includes(value);
}

export function needsOptions(type: RecruitQuestionType): boolean {
  return type === "select" || type === "radio" || type === "multiselect";
}

export function splitOptions(options: string | null | undefined): string[] {
  return (options ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function validateRecruitAnswer(
  q: Pick<RecruitQuestionRow, "type" | "options" | "required">,
  values: FormDataEntryValue[],
): { ok: true; answer: string | null } | { ok: false; reason: "required" | "invalid" } {
  const strings = values.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  if (strings.length === 0) return q.required ? { ok: false, reason: "required" } : { ok: true, answer: null };

  if (q.type === "text") {
    if (strings[0].length > RECRUIT_SHORT_TEXT_MAX) return { ok: false, reason: "invalid" };
    return { ok: true, answer: strings[0] };
  }

  if (q.type === "textarea") {
    if (strings[0].length > RECRUIT_TEXT_MAX) return { ok: false, reason: "invalid" };
    return { ok: true, answer: strings[0] };
  }

  const allowed = new Set(splitOptions(q.options));
  if (q.type === "multiselect") {
    const unique = [...new Set(strings)];
    if (unique.some((v) => !allowed.has(v))) return { ok: false, reason: "invalid" };
    return { ok: true, answer: unique.join("\n") };
  }
  // select / radio: tepat satu opsi yang dikenal.
  if (strings.length !== 1 || !allowed.has(strings[0])) return { ok: false, reason: "invalid" };
  return { ok: true, answer: strings[0] };
}