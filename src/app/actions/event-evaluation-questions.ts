"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventEvaluationAnswers, eventEvaluationQuestions, events } from "@/db/schema";
import { canEditCommitteeEvaluation, requireEventCapability } from "@/lib/event-access";
import { id as idDictionary } from "@/lib/i18n/dictionaries/id";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";
import { committeeEvalTemplateQuestions } from "@/lib/committee-evaluation";
import {
  type EvalAudience,
  type EvalQuestionType,
  isEvalAudience,
  isEvalQuestionType,
  needsOptions,
  splitOptions,
} from "@/lib/event-evaluation-questions";

// Builder pertanyaan evaluasi per-acara. Pola sama dengan builder pertanyaan
// pendaftaran (saveEventQuestion di admin-events.ts) dan digerbang kapabilitas
// yang sama (`event.registrationForm`): siapa pun yang boleh menyusun form
// pendaftaran boleh menyusun form evaluasi PESERTA. Pertanyaan audiens panitia
// dikecualikan, lihat requireQuestionAccess.

const CAPABILITY = "event.registrationForm" as const;

// Pertanyaan audiens panitia menilai kepanitiaan itu sendiri, jadi hanya BPH
// Kabinet/Teknologi atau BPH Panitia acara ini yang boleh menyusun, mengubah,
// atau menghapusnya. `event.registrationForm` adalah kapabilitas dasar SEMUA
// panitia, sehingga tanpa pengecekan ini anggota yang ikut dinilai bisa
// mengganti pertanyaannya, bahkan saat jendela pengisian sedang terbuka.
async function requireQuestionAccess(eventId: string, audience: EvalAudience) {
  const access = await requireEventCapability(eventId, CAPABILITY);
  if (audience === "panitia" && !canEditCommitteeEvaluation(access)) redirect("/console");
  return access;
}
const MAX_QUESTIONS = 40;
const MAX_LABEL = 300;
const MAX_OPTIONS = 30;
const MAX_OPTION_LENGTH = 120;

async function eventSlug(eventId: string): Promise<string | null> {
  const [row] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
  return row?.slug ?? null;
}

function revalidateEvaluation(eventId: string, slug: string | null) {
  revalidatePath(`/console/events/${eventId}`);
  if (slug) {
    revalidatePath(`/events/${slug}/evaluasi`);
    revalidatePath(`/events/${slug}/evaluasi-panitia`);
  }
}

function parseOptions(formData: FormData, type: EvalQuestionType): string | null {
  if (!needsOptions(type)) return null;
  const options = splitOptions(String(formData.get("options") ?? ""));
  // Pilihan tanpa opsi = pertanyaan yang tidak bisa dijawab - tolak di sini.
  if (options.length === 0) throw new Error("Tipe pilihan butuh minimal satu opsi (satu per baris)");
  if (options.length > MAX_OPTIONS) throw new Error(`Maksimal ${MAX_OPTIONS} opsi per pertanyaan`);
  if (options.some((o) => o.length > MAX_OPTION_LENGTH)) {
    throw new Error(`Satu opsi maksimal ${MAX_OPTION_LENGTH} karakter`);
  }
  if (new Set(options).size !== options.length) throw new Error("Ada opsi yang sama persis - hapus salah satu");
  return options.join("\n");
}

/** Tambah / ubah satu pertanyaan. Ada `id` = ubah; tanpa `id` = tambah di urutan terakhir. */
export async function saveEventEvaluationQuestion(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  // Audiens pertanyaan: "peserta" default; "panitia" untuk builder evaluasi panitia.
  const audienceRaw = String(formData.get("audience") ?? "peserta");
  if (!isEvalAudience(audienceRaw)) throw new Error("Audiens pertanyaan tidak valid");
  await requireQuestionAccess(eventId, audienceRaw);

  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "rating");
  if (!label) throw new Error("Teks pertanyaan wajib diisi");
  if (label.length > MAX_LABEL) throw new Error(`Pertanyaan maksimal ${MAX_LABEL} karakter`);
  if (!isEvalQuestionType(type)) throw new Error("Tipe pertanyaan tidak valid");

  const values = {
    eventId,
    audience: audienceRaw,
    label,
    type,
    options: parseOptions(formData, type),
    required: formData.get("required") === "on",
  };

  const questionId = String(formData.get("id") ?? "").trim();
  if (questionId) {
    // `id` + `eventId` bersama: mengedit pertanyaan acara LAIN dengan meng-POST
    // id-nya = no-op (0 baris), bukan pembajakan.
    const [existing] = await db
      .select({ type: eventEvaluationQuestions.type })
      .from(eventEvaluationQuestions)
      .where(
        and(
          eq(eventEvaluationQuestions.id, questionId),
          eq(eventEvaluationQuestions.eventId, eventId),
          // `audience` ikut dicocokkan: memindahkan pertanyaan lintas audiens
          // lewat form yang diutak-atik tidak boleh terjadi.
          eq(eventEvaluationQuestions.audience, audienceRaw),
        ),
      );
    if (!existing) return;
    if (existing.type !== type) {
      // Jawaban lama disimpan menurut tipe lamanya (angka vs teks); mengubah tipe
      // setelah ada jawaban membuat rekap campur aduk.
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(eventEvaluationAnswers)
        .where(eq(eventEvaluationAnswers.questionId, questionId));
      if (n > 0) throw new Error("Tipe pertanyaan tidak bisa diubah setelah ada jawaban. Hapus pertanyaan ini dan buat yang baru.");
    }
    await db
      .update(eventEvaluationQuestions)
      .set(values)
      .where(and(eq(eventEvaluationQuestions.id, questionId), eq(eventEvaluationQuestions.eventId, eventId)));
  } else {
    const [{ count, maxOrder }] = await db
      .select({
        count: sql<number>`count(*)::int`,
        maxOrder: sql<number>`coalesce(max(${eventEvaluationQuestions.orderIndex}), 0)`,
      })
      .from(eventEvaluationQuestions)
      .where(and(eq(eventEvaluationQuestions.eventId, eventId), eq(eventEvaluationQuestions.audience, audienceRaw)));
    if (count >= MAX_QUESTIONS) throw new Error(`Maksimal ${MAX_QUESTIONS} pertanyaan evaluasi per acara`);
    await db.insert(eventEvaluationQuestions).values({ ...values, orderIndex: Number(maxOrder) + 1 });
  }
  revalidateEvaluation(eventId, await eventSlug(eventId));
}

export async function deleteEventEvaluationQuestion(formData: FormData) {
  const questionId = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventEvaluationQuestions.eventId, audience: eventEvaluationQuestions.audience })
    .from(eventEvaluationQuestions)
    .where(eq(eventEvaluationQuestions.id, questionId));
  if (!row) return;
  // Audiens dibaca dari barisnya, bukan dari form: nilai yang tidak dikenal
  // diperlakukan sebagai yang paling ketat (panitia).
  await requireQuestionAccess(row.eventId, isEvalAudience(row.audience) ? row.audience : "panitia");
  // Jawaban yang sudah terkumpul tetap ada (question_id jadi NULL, label disalin).
  await db.delete(eventEvaluationQuestions).where(eq(eventEvaluationQuestions.id, questionId));
  revalidateEvaluation(row.eventId, await eventSlug(row.eventId));
}

/**
 * "Mulai dari template": menyalin pertanyaan template bawaan audiens ini
 * menjadi pertanyaan buatan sendiri yang bisa diedit. Peserta: template tetap
 * acara (WIF atau umum). Panitia: template evaluasi kolektif di
 * committee-evaluation.ts. Hanya jalan kalau audiens itu belum punya
 * pertanyaan sendiri, supaya tidak menggandakan.
 */
export async function startEvaluationFromTemplate(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const audienceRaw = String(formData.get("audience") ?? "peserta");
  if (!isEvalAudience(audienceRaw)) throw new Error("Audiens pertanyaan tidak valid");
  await requireQuestionAccess(eventId, audienceRaw);

  const slug = await eventSlug(eventId);
  if (!slug) return;
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(eventEvaluationQuestions)
    .where(
      and(
        eq(eventEvaluationQuestions.eventId, eventId),
        eq(eventEvaluationQuestions.audience, audienceRaw),
      ),
    );
  if (n > 0) return;

  if (audienceRaw === "panitia") {
    await db.insert(eventEvaluationQuestions).values(
      committeeEvalTemplateQuestions().map((q, i) => ({
        eventId,
        audience: audienceRaw,
        label: q.label,
        type: q.type,
        options: null,
        required: q.required,
        orderIndex: i + 1,
      })),
    );
  } else {
    const dict = idDictionary as Record<string, string>;
    const rows = evaluationTemplateForSlug(slug)
      .sections.flatMap((section) => section.questions)
      .map((q, i) => ({
        eventId,
        audience: audienceRaw,
        label: dict[q.labelKey] ?? q.label,
        type: q.kind === "rating" ? ("rating" as const) : ("textarea" as const),
        options: null,
        required: q.kind === "rating" ? true : !q.optional,
        orderIndex: i + 1,
      }));
    await db.insert(eventEvaluationQuestions).values(rows);
  }
  revalidateEvaluation(eventId, slug);
}
