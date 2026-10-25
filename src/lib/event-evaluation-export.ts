import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventDivisions, eventEvaluations, events, users } from "@/db/schema";
import { buildEvaluationDataset, type EvaluationDataset } from "@/lib/event-evaluation-dataset";
import { loadEvaluationAnswers, loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import type { EvalAudience } from "@/lib/event-evaluation-questions";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";

// Ambil respons evaluasi sebuah acara dari database dan rakit kolom + barisnya.
// SATU sumber untuk file Excel/CSV (/api/console/events/[id]/evaluasi/export)
// dan Google Sheet. Pemanggil yang memastikan hak aksesnya.
//
// null = acara tidak ada.
export async function loadEvaluationExport(
  eventId: string,
  audience: EvalAudience,
): Promise<{ title: string; dataset: EvaluationDataset } | null> {
  const [event] = await db.select({ title: events.title, slug: events.slug }).from(events).where(eq(events.id, eventId));
  if (!event) return null;

  const [rows, questions, answers] = await Promise.all([
    db
      .select({
        row: eventEvaluations,
        userName: users.name,
        divisionName: eventDivisions.name,
      })
      .from(eventEvaluations)
      .leftJoin(users, eq(eventEvaluations.userId, users.id))
      .leftJoin(eventDivisions, eq(eventEvaluations.divisionId, eventDivisions.id))
      .where(and(eq(eventEvaluations.eventId, eventId), eq(eventEvaluations.audience, audience)))
      .orderBy(desc(eventEvaluations.createdAt)),
    loadEvaluationQuestions(eventId, audience),
    loadEvaluationAnswers(eventId, audience),
  ]);

  // Nama & divisi evaluator hanya relevan untuk audiens panitia — dan jalur itu
  // sudah dipastikan hanya dijangkau pengelola.
  const mapped = rows.map((r) =>
    audience === "panitia" ? { ...r.row, respondentName: r.userName, respondentCity: r.divisionName } : r.row,
  );

  const dataset = buildEvaluationDataset({
    audience,
    sections: evaluationTemplateForSlug(event.slug).sections,
    rows: mapped,
    questions,
    answers,
  });
  return { title: event.title, dataset };
}
