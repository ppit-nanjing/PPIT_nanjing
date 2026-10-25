"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventEvaluationAnswers, eventEvaluations, eventRegistrations, events, sensusProfiles, users } from "@/db/schema";
import { issueParticipantCertificateIfEligible } from "@/lib/certificate-issuing";
import { qualifiesForParticipantCertificate } from "@/lib/certificate-eligibility";
import { canEditCommitteeEvaluation, requireEventConsoleAccess } from "@/lib/event-access";
import { isUniqueViolation } from "@/lib/db-errors";
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

// Acara yang memberi e-sertifikat peserta: evaluasi WAJIB dikirim dengan akun,
// karena sertifikat hanya untuk yang hadir DAN sudah mengisi evaluasi — evaluasi
// tanpa akun tidak bisa dicocokkan ke orangnya. Akun hanya dipakai untuk itu dan
// untuk mencegah isi dobel (token "peserta:<userId>" menggantikan token
// perangkat); pilihan anonim tetap menyembunyikan nama di rekap panitia.
type Responder = { userId: string | null; token: string };

async function resolveResponder(
  event: { certificateForParticipants: boolean },
  formData: FormData,
): Promise<Responder | { error: "login" | "invalid" }> {
  if (event.certificateForParticipants) {
    const session = await auth();
    if (!session?.user?.id) return { error: "login" };
    return { userId: session.user.id, token: `peserta:${session.user.id}` };
  }
  const token = typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  if (token.length < TOKEN_MIN || token.length > TOKEN_MAX) return { error: "invalid" };
  return { userId: null, token };
}

// Setelah evaluasi berakun tersimpan: terbitkan sertifikat bila berhak, dan
// kabari pengisi statusnya. Gagal di sini tidak boleh menggagalkan evaluasinya.
async function certificateAfterEvaluation(
  eventId: string,
  userId: string,
  requiresAttendance: boolean,
): Promise<EvalFormState["certificate"]> {
  try {
    if (await issueParticipantCertificateIfEligible(eventId, userId)) return "issued";
    const [reg] = await db
      .select({ status: eventRegistrations.status })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId)));
    if (reg && qualifiesForParticipantCertificate(reg.status, requiresAttendance)) return "pending";
    return requiresAttendance ? "not_attended" : "not_registered";
  } catch (error) {
    console.error("[event-evaluation] certificate issue failed:", error);
    return "pending";
  }
}

// Acara dengan evaluasi atas nama (evaluationAllowsAnonymous = false): kalau kolom
// nama dikosongkan, namanya diambil dari sensus (nama lengkap) lalu akun. Dibaca
// di server dari userId sesi, bukan dari isian form.
async function accountDisplayName(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ fullName: sensusProfiles.fullName, name: users.name })
    .from(users)
    .leftJoin(sensusProfiles, eq(sensusProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  const display = row?.fullName?.trim() || row?.name?.trim() || null;
  return display ? display.slice(0, NAME_MAX) : null;
}

function rating(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(value) || value < 1 || value > 10) return null;
  return value;
}

export async function submitEventEvaluation(
  _prev: EventEvaluationFormState,
  formData: FormData,
): Promise<EventEvaluationFormState> {
  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  if (!slug) return { error: "invalid" };

  const [event] = await db
    .select({
      id: events.id,
      status: events.status,
      certificateForParticipants: events.certificateForParticipants,
      certificateRequiresAttendance: events.certificateRequiresAttendance,
      evaluationAllowsAnonymous: events.evaluationAllowsAnonymous,
    })
    .from(events)
    .where(and(eq(events.slug, slug), isNull(events.deletedAt)));
  // Sama dengan halaman publiknya (404 untuk draft/terjadwal): aksi ini juga bisa
  // dipanggil langsung tanpa halaman, jadi gerbangnya harus ada di sini juga.
  if (!event || event.status === "draft" || event.status === "scheduled") return { error: "invalid" };

  // Acara dengan pertanyaan buatan panitia: bentuk jawabannya dinamis.
  const customQuestions = await loadEvaluationQuestions(event.id);
  const responder = await resolveResponder(event, formData);
  if ("error" in responder) return { error: responder.error };

  if (customQuestions.length > 0) {
    return submitCustomEvaluation(event.id, slug, customQuestions, formData, responder, {
      requiresAttendance: event.certificateRequiresAttendance,
      allowsAnonymous: event.evaluationAllowsAnonymous,
    });
  }

  const ratingRegistration = rating(formData, "ratingRegistration");
  const ratingFacilities = rating(formData, "ratingFacilities");
  const ratingCgt = rating(formData, "ratingCgt");
  const ratingOverall = rating(formData, "ratingOverall");
  if (!ratingRegistration || !ratingFacilities || !ratingCgt || !ratingOverall) {
    return { error: "ratings" };
  }

  // Acara yang mematikan opsi anonim: kotak anonim diabaikan di server juga.
  const anonymous =
    event.evaluationAllowsAnonymous && (formData.get("anonymous") === "on" || formData.get("anonymous") === "true");

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

  if (!anonymous && !name && responder.userId && !event.evaluationAllowsAnonymous) {
    name = await accountDisplayName(responder.userId);
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
      userId: responder.userId,
      responderToken: responder.token,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[event-evaluation] insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi`);
  if (!responder.userId) return { ok: true };
  revalidatePath("/profile");
  return {
    ok: true,
    certificate: await certificateAfterEvaluation(event.id, responder.userId, event.certificateRequiresAttendance),
  };
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
  responder: Responder,
  opts: { requiresAttendance: boolean; allowsAnonymous: boolean },
): Promise<EventEvaluationFormState> {
  const anonymous =
    opts.allowsAnonymous && (formData.get("anonymous") === "on" || formData.get("anonymous") === "true");
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

  if (!anonymous && !name && responder.userId && !opts.allowsAnonymous) {
    name = await accountDisplayName(responder.userId);
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
    userId: responder.userId,
    responderToken: responder.token,
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
  if (!responder.userId) return { ok: true };
  revalidatePath("/profile");
  return { ok: true, certificate: await certificateAfterEvaluation(eventId, responder.userId, opts.requiresAttendance) };
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
  // Respons panitia: gerbang ubah evaluasi panitia (ikut kunci kepanitiaan).
  if (row.audience === "panitia" && !canEditCommitteeEvaluation(access)) redirect(`/console/events/${eventId}`);
  const deleted = await db
    .delete(eventEvaluations)
    .where(and(eq(eventEvaluations.id, id), eq(eventEvaluations.eventId, eventId)))
    .returning({ id: eventEvaluations.id });
  // Audit SETELAH baris benar-benar terhapus: kalau DELETE gagal atau barisnya
  // sudah dihapus orang lain lebih dulu, log tidak boleh mengklaim penghapusan.
  if (row.audience === "panitia" && deleted.length > 0) {
    await logEventAudit(access.session.user.id, eventId, "committee_evaluation.deleted", {
      after: { evaluationId: id },
    });
  }
  revalidatePath(`/console/events/${eventId}`);
}
