import type { TKey } from "@/lib/i18n/dictionaries/id";

export type EvaluationRatingField =
  | "ratingRegistration"
  | "ratingFacilities"
  | "ratingCgt"
  | "ratingOverall";

export type EvaluationTextField =
  | "improveRegistration"
  | "improveFacilities"
  | "cgtMessage"
  | "improveService"
  | "overallMessage"
  | "heartwarming";

export type EvaluationQuestion =
  | { kind: "rating"; name: EvaluationRatingField; labelKey: TKey; label: string; hintKey?: TKey }
  | { kind: "text"; name: EvaluationTextField; labelKey: TKey; label: string; optional?: boolean };

export type EvaluationSection = { titleKey: TKey; title: string; questions: EvaluationQuestion[] };

export type EvaluationTemplate = { id: "wif" | "umum"; sections: EvaluationSection[] };

const WIF_TEMPLATE: EvaluationTemplate = {
  id: "wif",
  sections: [
    {
      titleKey: "eval.sectionRegistration",
      title: "Registrasi",
      questions: [
        { kind: "rating", name: "ratingRegistration", labelKey: "eval.q1", label: "Registrasi", hintKey: "eval.q1Hint" },
        { kind: "text", name: "improveRegistration", labelKey: "eval.q2", label: "Improve registrasi (2027)" },
      ],
    },
    {
      titleKey: "eval.sectionFacilities",
      title: "Fasilitas",
      questions: [
        { kind: "rating", name: "ratingFacilities", labelKey: "eval.q3", label: "Fasilitas" },
        { kind: "text", name: "improveFacilities", labelKey: "eval.q4", label: "Improve fasilitas & sarpras (2027)" },
      ],
    },
    {
      titleKey: "eval.sectionCgt",
      title: "Sharing CGT",
      questions: [
        { kind: "rating", name: "ratingCgt", labelKey: "eval.q5", label: "Sharing CGT", hintKey: "eval.q5Hint" },
        { kind: "text", name: "cgtMessage", labelKey: "eval.q6", label: "Kesan & pesan sharing CGT" },
      ],
    },
    {
      titleKey: "eval.sectionEvent",
      title: "Acara & Panitia",
      questions: [
        { kind: "rating", name: "ratingOverall", labelKey: "eval.q7", label: "Keseluruhan", hintKey: "eval.q7Hint" },
        { kind: "text", name: "improveService", labelKey: "eval.q8", label: "Improve pelayanan panitia & games" },
        { kind: "text", name: "overallMessage", labelKey: "eval.q9", label: "Kesan, pesan & saran keseluruhan" },
        { kind: "text", name: "heartwarming", labelKey: "eval.q10", label: "Heartwarming untuk panitia", optional: true },
      ],
    },
  ],
};

const UMUM_TEMPLATE: EvaluationTemplate = {
  id: "umum",
  sections: [
    {
      titleKey: "eval.sectionRegistration",
      title: "Registrasi",
      questions: [
        { kind: "rating", name: "ratingRegistration", labelKey: "eval.g1", label: "Registrasi", hintKey: "eval.q1Hint" },
        { kind: "text", name: "improveRegistration", labelKey: "eval.g2", label: "Improve registrasi" },
      ],
    },
    {
      titleKey: "eval.sectionFacilities",
      title: "Fasilitas",
      questions: [
        { kind: "rating", name: "ratingFacilities", labelKey: "eval.g3", label: "Fasilitas" },
        { kind: "text", name: "improveFacilities", labelKey: "eval.g4", label: "Improve fasilitas & sarpras" },
      ],
    },
    {
      titleKey: "eval.sectionSession",
      title: "Sesi & Materi",
      questions: [
        { kind: "rating", name: "ratingCgt", labelKey: "eval.g5", label: "Sesi & Materi", hintKey: "eval.g5Hint" },
        { kind: "text", name: "cgtMessage", labelKey: "eval.g6", label: "Kesan & pesan sesi & materi" },
      ],
    },
    {
      titleKey: "eval.sectionEvent",
      title: "Acara & Panitia",
      questions: [
        { kind: "rating", name: "ratingOverall", labelKey: "eval.g7", label: "Keseluruhan", hintKey: "eval.g7Hint" },
        { kind: "text", name: "improveService", labelKey: "eval.g8", label: "Improve pelayanan panitia & rangkaian acara" },
        { kind: "text", name: "overallMessage", labelKey: "eval.g9", label: "Kesan, pesan & saran keseluruhan" },
        { kind: "text", name: "heartwarming", labelKey: "eval.q10", label: "Heartwarming untuk panitia", optional: true },
      ],
    },
  ],
};

// WIF punya pertanyaan spesifik (sesi CGT); acara lain memakai template umum.
// Resolver berbasis slug supaya setiap acara otomatis dapat evaluasi tanpa
// konfigurasi tambahan. Template baru tinggal ditambah di sini.
export function evaluationTemplateForSlug(slug: string): EvaluationTemplate {
  if (slug.startsWith("wif")) return WIF_TEMPLATE;
  return UMUM_TEMPLATE;
}

export function ratingQuestions(sections: EvaluationSection[]): Extract<EvaluationQuestion, { kind: "rating" }>[] {
  return sections.flatMap((s) =>
    s.questions.filter((q): q is Extract<EvaluationQuestion, { kind: "rating" }> => q.kind === "rating"),
  );
}

export function textQuestions(sections: EvaluationSection[]): Extract<EvaluationQuestion, { kind: "text" }>[] {
  return sections.flatMap((s) =>
    s.questions.filter((q): q is Extract<EvaluationQuestion, { kind: "text" }> => q.kind === "text"),
  );
}
