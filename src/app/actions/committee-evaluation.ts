"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  eventCommittee,
  eventEvaluationAnswers,
  eventEvaluationQuestions,
  eventEvaluations,
  events,
} from "@/db/schema";
import { requireEventConsoleAccess } from "@/lib/event-access";
import { type EvalFormState, validateEvalAnswer, type EvalQuestionRow } from "@/lib/event-evaluation-questions";
import { loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import {
  committeeEvalTemplateQuestions,
  committeeEvalWindowState,
} from "@/lib/committee-evaluation";

// Evaluasi panitia per-acara (kolektif), dibangun di atas builder pertanyaan
// evaluasi (PR #74) lewat kolom audience = "panitia" di event_evaluation_questions
// dan event_evaluations. Semua aksi di sini adalah batas permintaan publik:
// gerbang login + roster + jendela waktu dicek DI SINI, bukan cuma di halaman
// yang memanggilnya.

export type CommitteeEvaluationFormState = EvalFormState;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// Kirim evaluasi panitia: HARUS login, HARUS tercatat di event_committee acara
// ini, dan jendela (events.committee_eval_opens_at/closes_at) harus sedang
// terbuka saat aksi dieksekusi. Identitas pengisi = akunnya (bukan isian bebas)
// — dedup-nya unique index (event_id, user_id) untuk audience 'panitia' plus
// token `panitia:<userId>` yang menabrak unique (event_id, responder_token).
export async function submitCommitteeEvaluation(
  _prev: CommitteeEvaluationFormState,
  formData: FormData,
): Promise<CommitteeEvaluationFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "login" };
  const userId = session.user.id;

  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim() : "";
  if (!slug) return { error: "invalid" };

  const [event] = await db
    .select({
      id: events.id,
      status: events.status,
      opensAt: events.committeeEvalOpensAt,
      closesAt: events.committeeEvalClosesAt,
    })
    .from(events)
    .where(eq(events.slug, slug));
  // Gerbang sama dengan halaman publiknya: draft/terjadwal tidak bisa dievaluasi,
  // dan acara yang dibatalkan tidak layak dievaluasi (K4).
  if (!event || event.status === "draft" || event.status === "scheduled" || event.status === "cancelled") {
    return { error: "invalid" };
  }

  if (committeeEvalWindowState(event.opensAt, event.closesAt) !== "open") return { error: "window" };

  // Keanggotaan panitia + snapshot divisi sekaligus (satu baris event_committee).
  const [member] = await db
    .select({ divisionId: eventCommittee.divisionId })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, userId)));
  // Pesan "login" untuk orang yang sudah login tapi bukan panitia menyesatkan
  // (K4) — bedakan jadi "not_committee".
  if (!member) return { error: "not_committee" };

  // Pertanyaan audiens panitia selalu baris DB: saveCommitteeEvaluationWindow
  // menyalin template kolektif begitu jendela dipasang, dan jendela wajib ada
  // sebelum siapa pun bisa mengisi. Tanpa baris = BPH menghapus semuanya; jangan
  // jatuh ke template statis, karena jawabannya tidak akan cocok dengan kolom
  // rekap/ekspor (questionId NULL dikunci per label, bukan per pertanyaan).
  const questions: EvalQuestionRow[] = await loadEvaluationQuestions(event.id, "panitia");
  if (questions.length === 0) return { error: "not_ready" };

  const answers: { questionId: string; label: string; type: string; text: string | null; number: number | null }[] = [];
  for (const q of questions) {
    const result = validateEvalAnswer(q, formData.getAll(`q_${q.id}`));
    if (!result.ok) return { error: result.reason === "required" ? "required" : "invalid" };
    if (result.answer) {
      answers.push({
        questionId: q.id,
        label: q.label,
        type: q.type,
        text: result.answer.text,
        number: result.answer.number,
      });
    }
  }

  const evaluationId = crypto.randomUUID();
  const insertEvaluation = db.insert(eventEvaluations).values({
    id: evaluationId,
    eventId: event.id,
    audience: "panitia",
    userId,
    divisionId: member.divisionId,
    responderToken: `panitia:${userId}`,
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
    console.error("[committee-evaluation] insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi-panitia`);
  revalidatePath(`/console/events/${event.id}`);
  return { ok: true };
}

// Gerbang pengelola evaluasi panitia (B2): BPH Kabinet/Teknologi atau BPH
// Panitia acara ini. Peran panitia lain tidak boleh membaca isi jawaban, belum
// lagi menghapus/mengekspor/mengubah jendela — aksi di bawah memakai ini, bukan
// sekadar menyembunyikan tombolnya di UI.
async function requireCommitteeEvalManager(eventId: string) {
  const access = await requireEventConsoleAccess(eventId);
  if (!access.isFullAdmin && !access.isBphPanitia) redirect("/console");
  return access;
}

// Pasang/hapus jendela waktu. Ditujukan untuk tab "Panitia" di section
// "Evaluasi Acara" konsol kegiatan: opensAt/closesAt datang sebagai nilai
// datetime-local (boleh kosong). Kosong dua-duanya = jadwal dilepas (kembali
// "belum dijadwalkan"). Salah isi DIBALAS sebagai error form state, bukan
// diam-diam diabaikan — kalau tidak, tombol simpan tetap tampak berhasil (M4).
export async function saveCommitteeEvaluationWindow(
  _prev: CommitteeEvalWindowFormState,
  formData: FormData,
): Promise<CommitteeEvalWindowFormState> {
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")).trim() : "";
  if (!UUID_RE.test(eventId)) return { error: "Acara tidak valid." };
  await requireCommitteeEvalManager(eventId);

  function parseLocal(value: FormDataEntryValue | null): Date | null {
    if (typeof value !== "string" || !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const opensAt = parseLocal(formData.get("opensAt"));
  const closesAt = parseLocal(formData.get("closesAt"));
  if (opensAt && closesAt && closesAt <= opensAt) {
    return { error: "Waktu tutup harus setelah waktu buka." };
  }
  if (closesAt && !opensAt && closesAt.getTime() <= Date.now()) {
    return { error: "Waktu tutup sudah lewat — isi ulang atau kosongkan." };
  }

  const [event] = await db
    .select({ slug: events.slug })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return { error: "Acara tidak ditemukan." };

  await db
    .update(events)
    .set({ committeeEvalOpensAt: opensAt, committeeEvalClosesAt: closesAt })
    .where(eq(events.id, eventId));

  // Begitu jendela dipasang, pastikan acara punya pertanyaan panitia sebagai
  // baris DB (salinan template kolektif bila BPH belum menyusun sendiri). Jendela
  // wajib ada sebelum siapa pun bisa mengisi, jadi setiap jawaban panitia selalu
  // menunjuk questionId uuid yang asli dan rekap/ekspor membaca kolom yang benar.
  if (opensAt || closesAt) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(eventEvaluationQuestions)
      .where(and(eq(eventEvaluationQuestions.eventId, eventId), eq(eventEvaluationQuestions.audience, "panitia")));
    if (n === 0) {
      await db.insert(eventEvaluationQuestions).values(
        committeeEvalTemplateQuestions().map((q, i) => ({
          eventId,
          audience: "panitia",
          label: q.label,
          type: q.type,
          options: null,
          required: q.required,
          orderIndex: i + 1,
        })),
      );
    }
  }

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath(`/events/${event.slug}/evaluasi-panitia`);
  return { ok: true };
}

export type CommitteeEvalWindowFormState = {
  ok?: boolean;
  error?: string;
};
