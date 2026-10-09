"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventEvaluationAnswers, eventEvaluations, events } from "@/db/schema";
import { requireEventConsoleAccess } from "@/lib/event-access";
import { logEventAudit } from "@/lib/event-audit";
import { type EvalFormState, type EvalQuestionRow, validateEvalAnswer } from "@/lib/event-evaluation-questions";
import { loadEvaluationQuestions } from "@/lib/event-evaluation-queries";

export type EventEvaluationFormState = EvalFormState;

const TEXT_MAX = 2000;
const NAME_MAX = 80;
const CITY_MAX = 40;
const TOKEN_MIN = 8;
const TOKEN_MAX = 100;

function trimmedText(formData: FormData, key: string, max: number): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.length > max) throw new Error("too_long");
  return value;
}

function rating(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > 10) return null;
  return value;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
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

export async function submitEventEvaluation(
  _prev: EventEvaluationFormState,
  formData: FormData,
): Promise<EventEvaluationFormState> {
  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  if (!slug) return { error: "invalid" };

  const [event] = await db
    .select({ id: events.id, status: events.status })
    .from(events)
    .where(eq(events.slug, slug));
  // Sama dengan halaman publiknya (404 untuk draft/terjadwal): aksi ini juga bisa
  // dipanggil langsung tanpa halaman, jadi gerbangnya harus ada di sini juga.
  if (!event || event.status === "draft" || event.status === "scheduled") return { error: "invalid" };

  // Acara dengan pertanyaan buatan panitia: bentuk jawabannya dinamis.
  const customQuestions = await loadEvaluationQuestions(event.id);
  if (customQuestions.length > 0) {
    return submitCustomEvaluation(event.id, slug, customQuestions, formData);
  }

  const ratingRegistration = rating(formData, "ratingRegistration");
  const ratingFacilities = rating(formData, "ratingFacilities");
  const ratingCgt = rating(formData, "ratingCgt");
  const ratingOverall = rating(formData, "ratingOverall");
  if (!ratingRegistration || !ratingFacilities || !ratingCgt || !ratingOverall) {
    return { error: "ratings" };
  }

  const token = typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  if (token.length < TOKEN_MIN || token.length > TOKEN_MAX) return { error: "invalid" };

  const anonymous = formData.get("anonymous") === "on" || formData.get("anonymous") === "true";

  let name: string | null = null;
  let city: string | null = null;
  let improveRegistration: string | null = null;
  let improveFacilities: string | null = null;
  let cgtMessage: string | null = null;
  let improveService: string | null = null;
  let overallMessage: string | null = null;
  let heartwarming: string | null = null;

  try {
    if (!anonymous) {
      name = trimmedText(formData, "name", NAME_MAX);
      city = trimmedText(formData, "city", CITY_MAX);
    }
    improveRegistration = trimmedText(formData, "improveRegistration", TEXT_MAX);
    improveFacilities = trimmedText(formData, "improveFacilities", TEXT_MAX);
    cgtMessage = trimmedText(formData, "cgtMessage", TEXT_MAX);
    improveService = trimmedText(formData, "improveService", TEXT_MAX);
    overallMessage = trimmedText(formData, "overallMessage", TEXT_MAX);
    heartwarming = trimmedText(formData, "heartwarming", TEXT_MAX);
  } catch {
    return { error: "invalid" };
  }

  // Pertanyaan teks wajib (non-optional) mengikuti template: hanya `heartwarming`
  // yang opsional. Kalau template berubah, samakan daftar ini.
  if (!improveRegistration || !improveFacilities || !cgtMessage || !improveService || !overallMessage) {
    return { error: "required" };
  }

  try {
    await db.insert(eventEvaluations).values({
      eventId: event.id,
      // Respons template tetap selalu audiens peserta.
      audience: "peserta",
      ratingRegistration,
      ratingFacilities,
      ratingCgt,
      ratingOverall,
      improveRegistration,
      improveFacilities,
      cgtMessage,
      improveService,
      overallMessage,
      heartwarming,
      respondentName: name,
      respondentCity: city,
      anonymous,
      responderToken: token,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[event-evaluation] insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi`);
  return { ok: true };
}

// Jalur untuk acara yang punya pertanyaan evaluasi buatan panitia. Field jawaban
// bernama `q_<id pertanyaan>`; identitas (nama/kota/anonim) dan token perangkat
// sama dengan jalur template. Respons + semua jawabannya ditulis dalam satu
// batch (satu transaksi), supaya tidak ada respons tanpa jawaban kalau gagal di tengah.
async function submitCustomEvaluation(
  eventId: string,
  slug: string,
  questions: EvalQuestionRow[],
  formData: FormData,
): Promise<EventEvaluationFormState> {
  const token = typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  if (token.length < TOKEN_MIN || token.length > TOKEN_MAX) return { error: "invalid" };

  const anonymous = formData.get("anonymous") === "on" || formData.get("anonymous") === "true";
  let name: string | null = null;
  let city: string | null = null;
  try {
    if (!anonymous) {
      name = trimmedText(formData, "name", NAME_MAX);
      city = trimmedText(formData, "city", CITY_MAX);
    }
  } catch {
    return { error: "invalid" };
  }

  const answers: { questionId: string; label: string; type: string; text: string | null; number: number | null }[] = [];
  for (const q of questions) {
    const result = validateEvalAnswer(q, formData.getAll(`q_${q.id}`));
    if (!result.ok) return { error: result.reason === "required" ? "required" : "invalid" };
    if (result.answer) {
      answers.push({ questionId: q.id, label: q.label, type: q.type, text: result.answer.text, number: result.answer.number });
    }
  }

  const evaluationId = crypto.randomUUID();
  const insertEvaluation = db.insert(eventEvaluations).values({
    id: evaluationId,
    eventId,
    audience: "peserta",
    respondentName: name,
    respondentCity: city,
    anonymous,
    responderToken: token,
  });

  try {
    if (answers.length > 0) {
      await db.batch([
        insertEvaluation,
        db.insert(eventEvaluationAnswers).values(
          answers.map((a) => ({
            evaluationId,
            questionId: a.questionId,
            questionLabel: a.label,
            questionType: a.type,
            valueText: a.text,
            valueNumber: a.number,
          })),
        ),
      ]);
    } else {
      await insertEvaluation;
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[event-evaluation] custom insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi`);
  return { ok: true };
}

export async function deleteEventEvaluation(formData: FormData): Promise<void> {
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")) : "";
  if (!id || !eventId) return;
  const access = await requireEventConsoleAccess(eventId);
  // Respons audiens panitia memuat kritik bersama nama pengisinya (B2):
  // menghapusnya hanya boleh BPH Kabinet/Teknologi atau BPH Panitia acara ini,
  // dan wajib tercatat di audit log. Respons peserta mengikuti gerbang konsol
  // acara seperti sebelumnya.
  const [row] = await db
    .select({ audience: eventEvaluations.audience })
    .from(eventEvaluations)
    .where(and(eq(eventEvaluations.id, id), eq(eventEvaluations.eventId, eventId)));
  if (!row) return;
  if (row.audience === "panitia") {
    if (!access.isFullAdmin && !access.isBphPanitia) redirect("/console");
    await logEventAudit(access.session.user.id, eventId, "committee_evaluation.deleted", {
      after: { evaluationId: id },
    });
  }
  await db
    .delete(eventEvaluations)
    .where(and(eq(eventEvaluations.id, id), eq(eventEvaluations.eventId, eventId)));
  revalidatePath(`/console/events/${eventId}`);
}
