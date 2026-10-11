"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventRecruitmentQuestions, eventRecruitmentApplications, events } from "@/db/schema";
import { requireEventCapability } from "@/lib/event-access";
import {
  type RecruitFormState,
  type RecruitQuestionType,
  isRecruitQuestionType,
  needsOptions,
  splitOptions,
} from "@/lib/event-recruitment-questions";

const CAPABILITY = "event.registrationForm" as const;
const MAX_QUESTIONS = 40;
const MAX_LABEL = 300;
const MAX_OPTIONS = 30;
const MAX_OPTION_LENGTH = 120;

async function eventSlug(eventId: string): Promise<string | null> {
  const [row] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, eventId));
  return row?.slug ?? null;
}

function revalidateRecruitment(eventId: string, slug: string | null) {
  revalidatePath(`/console/events/${eventId}`);
  if (slug) revalidatePath(`/events/${slug}/daftar-panitia`);
}

function parseOptions(formData: FormData, type: RecruitQuestionType): string | null {
  if (!needsOptions(type)) return null;
  const options = splitOptions(String(formData.get("options") ?? ""));
  if (options.length === 0) throw new Error("Tipe pilihan butuh minimal satu opsi (satu per baris)");
  if (options.length > MAX_OPTIONS) throw new Error(`Maksimal ${MAX_OPTIONS} opsi per pertanyaan`);
  if (options.some((o) => o.length > MAX_OPTION_LENGTH)) {
    throw new Error(`Satu opsi maksimal ${MAX_OPTION_LENGTH} karakter`);
  }
  if (new Set(options).size !== options.length) throw new Error("Ada opsi yang sama persis - hapus salah satu");
  return options.join("\n");
}

export async function saveRecruitmentQuestion(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  await requireEventCapability(eventId, CAPABILITY);

  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  if (!label) throw new Error("Teks pertanyaan wajib diisi");
  if (label.length > MAX_LABEL) throw new Error(`Pertanyaan maksimal ${MAX_LABEL} karakter`);
  if (!isRecruitQuestionType(type)) throw new Error("Tipe pertanyaan tidak valid");

  const values = {
    eventId,
    label,
    type,
    options: parseOptions(formData, type),
    required: formData.get("required") === "on",
  };

  const questionId = String(formData.get("id") ?? "").trim();
  if (questionId) {
    const [existing] = await db
      .select({ label: eventRecruitmentQuestions.label })
      .from(eventRecruitmentQuestions)
      .where(and(eq(eventRecruitmentQuestions.id, questionId), eq(eventRecruitmentQuestions.eventId, eventId)));
    if (!existing) return;
    await db
      .update(eventRecruitmentQuestions)
      .set(values)
      .where(and(eq(eventRecruitmentQuestions.id, questionId), eq(eventRecruitmentQuestions.eventId, eventId)));
  } else {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventRecruitmentQuestions)
      .where(eq(eventRecruitmentQuestions.eventId, eventId));
    if (count >= MAX_QUESTIONS) throw new Error(`Maksimal ${MAX_QUESTIONS} pertanyaan rekrutmen per acara`);
    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${eventRecruitmentQuestions.orderIndex}), 0)` })
      .from(eventRecruitmentQuestions)
      .where(eq(eventRecruitmentQuestions.eventId, eventId));
    await db.insert(eventRecruitmentQuestions).values({ ...values, orderIndex: Number(maxOrder) + 1 });
  }
  revalidateRecruitment(eventId, await eventSlug(eventId));
}

export async function deleteRecruitmentQuestion(formData: FormData) {
  const questionId = String(formData.get("id") ?? "");
  const [row] = await db
    .select({ eventId: eventRecruitmentQuestions.eventId })
    .from(eventRecruitmentQuestions)
    .where(eq(eventRecruitmentQuestions.id, questionId));
  if (!row) return;
  await requireEventCapability(row.eventId, CAPABILITY);
  await db.delete(eventRecruitmentQuestions).where(eq(eventRecruitmentQuestions.id, questionId));
  revalidateRecruitment(row.eventId, await eventSlug(row.eventId));
}

export async function setRecruitEnabled(eventId: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await requireEventCapability(eventId, "event.editInfo");
  await db
    .update(events)
    .set({ recruitEnabled: enabled })
    .where(eq(events.id, eventId));
  revalidateRecruitment(eventId, await eventSlug(eventId));
}

export async function submitRecruitmentApplication(
  _prev: RecruitFormState,
  formData: FormData,
): Promise<RecruitFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "login" };

  const slug = String(formData.get("slug") ?? "");
  const [event] = await db
    .select({ id: events.id, recruitEnabled: events.recruitEnabled })
    .from(events)
    .where(eq(events.slug, slug));
  if (!event || !event.recruitEnabled) return { error: "closed" };

  const [existing] = await db
    .select({ id: eventRecruitmentApplications.id })
    .from(eventRecruitmentApplications)
    .where(
      and(
        eq(eventRecruitmentApplications.eventId, event.id),
        eq(eventRecruitmentApplications.userId, session.user.id),
      ),
    );
  if (existing) return { already: true };

  const questions = await db
    .select()
    .from(eventRecruitmentQuestions)
    .where(eq(eventRecruitmentQuestions.eventId, event.id))
    .orderBy(eventRecruitmentQuestions.orderIndex);

  const answers: Record<string, string> = {};
  for (const q of questions) {
    const values = formData.getAll(`q_${q.id}`);
    const strings = values.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
    if (q.required && strings.length === 0) return { error: "required" };
    if (strings.length > 0) {
      if (q.type === "multiselect") {
        const allowed = new Set(splitOptions(q.options));
        const unique = [...new Set(strings)];
        if (unique.some((v) => !allowed.has(v))) return { error: "invalid" };
        answers[q.id] = unique.join("\n");
      } else if (q.type === "select" || q.type === "radio") {
        const allowed = new Set(splitOptions(q.options));
        if (strings.length !== 1 || !allowed.has(strings[0])) return { error: "invalid" };
        answers[q.id] = strings[0];
      } else if (q.type === "text") {
        if (strings[0].length > 300) return { error: "invalid" };
        answers[q.id] = strings[0];
      } else if (q.type === "textarea") {
        if (strings[0].length > 2000) return { error: "invalid" };
        answers[q.id] = strings[0];
      }
    }
  }

  await db.insert(eventRecruitmentApplications).values({
    eventId: event.id,
    userId: session.user.id,
    answersJson: answers,
  });

  revalidateRecruitment(event.id, slug);
  return { ok: true };
}

export async function reviewRecruitmentApplication(formData: FormData) {
  const appId = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Keputusan tidak valid");

  const [app] = await db
    .select({ eventId: eventRecruitmentApplications.eventId, userId: eventRecruitmentApplications.userId })
    .from(eventRecruitmentApplications)
    .where(eq(eventRecruitmentApplications.id, appId));
  if (!app) return;

  await requireEventCapability(app.eventId, "event.manageCommittee");

  const note = String(formData.get("note") ?? "").trim();

  await db
    .update(eventRecruitmentApplications)
    .set({ status: decision, reviewNote: note || null })
    .where(eq(eventRecruitmentApplications.id, appId));

  revalidateRecruitment(app.eventId, await eventSlug(app.eventId));
}