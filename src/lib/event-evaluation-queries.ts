import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventEvaluationAnswers, eventEvaluationQuestions, eventEvaluations } from "@/db/schema";
import type { EvalQuestionRow } from "@/lib/event-evaluation-questions";
import type { EvalAnswerRow } from "@/lib/event-evaluation-results";

// Pembacaan pertanyaan/jawaban evaluasi buatan panitia, satu tempat untuk halaman
// publik, aksi kirim, konsol, dan ekspor.
//
// TOLERAN terhadap migrasi yang belum dijalankan: tabelnya baru (drizzle/0044),
// dan migrasi di proyek ini dijalankan manual ke database produksi, jadi kode
// bisa saja ter-deploy lebih dulu. Selama tabelnya belum ada, hasilnya "tidak ada
// pertanyaan sendiri" dan semua acara memakai template tetap persis seperti
// sebelumnya, alih-alih error 500 di konsol acara dan form evaluasi publik.

function isMissingRelation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "42P01" // undefined_table
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return false;
}

async function tolerant<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isMissingRelation(error)) {
      console.warn("[event-evaluation] tabel pertanyaan evaluasi belum ada - jalankan drizzle/0044_event_evaluation_questions.sql");
      return fallback;
    }
    throw error;
  }
}

/** Pertanyaan evaluasi buatan panitia untuk satu acara, berurutan. Kosong = pakai template tetap. */
export function loadEvaluationQuestions(eventId: string): Promise<EvalQuestionRow[]> {
  return tolerant(
    async () =>
      (await db
        .select()
        .from(eventEvaluationQuestions)
        .where(eq(eventEvaluationQuestions.eventId, eventId))
        .orderBy(eventEvaluationQuestions.orderIndex, eventEvaluationQuestions.id)) as EvalQuestionRow[],
    [],
  );
}

/** Semua jawaban dari semua respons acara ini. */
export function loadEvaluationAnswers(eventId: string): Promise<EvalAnswerRow[]> {
  return tolerant(
    () =>
      db
        .select({
          evaluationId: eventEvaluationAnswers.evaluationId,
          questionId: eventEvaluationAnswers.questionId,
          questionLabel: eventEvaluationAnswers.questionLabel,
          questionType: eventEvaluationAnswers.questionType,
          valueText: eventEvaluationAnswers.valueText,
          valueNumber: eventEvaluationAnswers.valueNumber,
        })
        .from(eventEvaluationAnswers)
        .innerJoin(eventEvaluations, eq(eventEvaluationAnswers.evaluationId, eventEvaluations.id))
        .where(eq(eventEvaluations.eventId, eventId)),
    [],
  );
}
