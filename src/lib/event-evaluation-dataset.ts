// Kolom + baris evaluasi acara, SATU sumber untuk file Excel/CSV
// (/api/console/events/[id]/evaluasi/export) dan tab "Tabel" di konsol, supaya
// tabel di layar selalu persis sama dengan isi file ekspor.
//
// Murni dan aman di sisi klien: hanya tipe dari database/ekspor, tanpa exceljs.
import type { InferSelectModel } from "drizzle-orm";
import type { eventEvaluations } from "@/db/schema";
import { ratingQuestions, textQuestions, type EvaluationSection } from "@/lib/event-evaluation-template";
import { isScaleType, type EvalQuestionRow } from "@/lib/event-evaluation-questions";
import { answersByEvaluation, evalColumns, formatAnswer, type EvalAnswerRow } from "@/lib/event-evaluation-results";
import type { ReportColumn } from "@/lib/report-export";

export type EvaluationRow = InferSelectModel<typeof eventEvaluations>;

export type EvaluationDataset = {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
};

export function buildEvaluationDataset(input: {
  audience: "peserta" | "panitia";
  /** Bagian pertanyaan template tetap (kosong bila hanya respons pertanyaan sendiri). */
  sections: EvaluationSection[];
  /** Untuk audiens panitia, respondentName/respondentCity sudah diisi nama + divisi evaluator. */
  rows: EvaluationRow[];
  questions: EvalQuestionRow[];
  answers: EvalAnswerRow[];
}): EvaluationDataset {
  const { audience, sections, rows, questions, answers } = input;

  // Respons bentuk template tetap punya keempat penilaian bawaan; respons dari
  // pertanyaan buatan panitia membiarkannya kosong (jawabannya di tabel jawaban).
  const isTemplateRow = (r: EvaluationRow) => r.ratingRegistration != null;
  const hasTemplateRows = rows.some(isTemplateRow);
  const customMode = questions.length > 0 || rows.some((r) => !isTemplateRow(r));

  const templateColumns: ReportColumn[] = [
    ...ratingQuestions(sections).map((q) => ({ header: `${q.label} (1-10)`, key: q.name, type: "number" as const })),
    ...textQuestions(sections).map((q) => ({ header: q.label, key: q.name })),
  ];

  const customColumns = customMode ? evalColumns(questions, answers) : [];
  const byEvaluation = answersByEvaluation(answers);

  const columns: ReportColumn[] = [
    { header: "Waktu", key: "createdAt", type: "date" },
    { header: "Nama", key: "respondentName" },
    { header: audience === "panitia" ? "Divisi" : "Kota", key: "respondentCity" },
    // Kolom anonim hanya berarti untuk respons peserta; evaluasi panitia selalu
    // tercatat atas nama akunnya.
    ...(audience === "panitia" ? [] : [{ header: "Anonim", key: "anonymousLabel" }]),
    // Mode pertanyaan sendiri: satu kolom per pertanyaan (yang sudah dihapus tapi
    // masih punya jawaban ikut, diberi tanda). Respons template lama, kalau ada,
    // tetap diekspor dengan kolom template-nya di belakang.
    ...customColumns.map((c, i) => ({
      header: c.removed ? `${c.label} (dihapus)` : c.label,
      key: `c${i}`,
      ...(isScaleType(c.type) ? { type: "number" as const } : {}),
    })),
    ...(!customMode || hasTemplateRows ? templateColumns : []),
  ];

  return {
    columns,
    rows: rows.map((r) => {
      const own = byEvaluation.get(r.id);
      const customValues = Object.fromEntries(
        customColumns.map((c, i) => {
          const answer = own?.get(c.key);
          return [`c${i}`, isScaleType(c.type) ? (answer?.valueNumber ?? null) : formatAnswer(answer)];
        }),
      );
      return {
        createdAt: r.createdAt,
        respondentName: r.anonymous || !r.respondentName ? "" : r.respondentName,
        respondentCity: r.anonymous ? "" : r.respondentCity,
        anonymousLabel: r.anonymous ? "Ya" : "Tidak",
        ...customValues,
        ...(audience === "panitia"
          ? {}
          : {
              ratingRegistration: r.ratingRegistration,
              ratingFacilities: r.ratingFacilities,
              ratingCgt: r.ratingCgt,
              ratingOverall: r.ratingOverall,
              improveRegistration: r.improveRegistration,
              improveFacilities: r.improveFacilities,
              cgtMessage: r.cgtMessage,
              improveService: r.improveService,
              overallMessage: r.overallMessage,
              heartwarming: r.heartwarming,
            }),
      };
    }),
  };
}
