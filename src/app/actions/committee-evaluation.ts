"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventCommitteeEvaluations, events } from "@/db/schema";
import { requireEventConsoleAccess } from "@/lib/event-access";
import {
  COMMITTEE_EVAL_ASPECTS,
  COMMITTEE_EVAL_RATING_MAX,
  COMMITTEE_EVAL_RATING_MIN,
  COMMITTEE_EVAL_TEXT_MAX,
  committeeEvalWindowState,
} from "@/lib/committee-evaluation";

// Evaluasi panitia per-acara (kolektif). Semua aksi di sini adalah batas
// permintaan publik/konsol: gerbang keanggotaan + jendela waktu dicek DI SINI,
// bukan cuma di halaman yang memanggilnya.

export type CommitteeEvaluationFormState = {
  ok?: boolean;
  already?: boolean;
  error?: "login" | "window" | "ratings" | "required" | "invalid" | "generic";
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rating(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(value) || value < COMMITTEE_EVAL_RATING_MIN || value > COMMITTEE_EVAL_RATING_MAX) {
    return null;
  }
  return value;
}

function requiredText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > COMMITTEE_EVAL_TEXT_MAX) return null;
  return value;
}

function optionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.length > COMMITTEE_EVAL_TEXT_MAX) throw new Error("too_long");
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

// Kirim evaluasi panitia: HARUS login, HARUS tercatat di event_committee acara
// ini, dan jendela (events.committee_eval_opens_at/closes_at) harus sedang
// terbuka saat aksi dieksekusi. Identitas pengisi = akunnya (bukan isian bebas)
// — unique (event_id, user_id) mencegah isi dobel.
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
  // Gerbang sama dengan halaman publiknya: draft/terjadwal tidak bisa dievaluasi.
  if (!event || event.status === "draft" || event.status === "scheduled") return { error: "invalid" };

  if (committeeEvalWindowState(event.opensAt, event.closesAt) !== "open") return { error: "window" };

  // Keanggotaan panitia + snapshot divisi sekaligus (satu baris event_committee).
  const [member] = await db
    .select({ divisionId: eventCommittee.divisionId })
    .from(eventCommittee)
    .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, userId)));
  if (!member) return { error: "login" };

  const values = { ratingCoordination: 0, ratingTeamwork: 0, ratingCommunication: 0, ratingWorkload: 0, ratingSatisfaction: 0 } as Record<
    (typeof COMMITTEE_EVAL_ASPECTS)[number]["field"],
    number | null
  >;
  for (const aspect of COMMITTEE_EVAL_ASPECTS) {
    const value = rating(formData, aspect.field);
    if (!value) return { error: "ratings" };
    values[aspect.field] = value;
  }

  let wentWell: string | null = null;
  let toImprove: string | null = null;
  let feedback: string | null = null;
  try {
    wentWell = requiredText(formData, "wentWell");
    toImprove = requiredText(formData, "toImprove");
    feedback = optionalText(formData, "feedback");
  } catch {
    return { error: "invalid" };
  }
  if (!wentWell || !toImprove) return { error: "required" };

  try {
    await db.insert(eventCommitteeEvaluations).values({
      eventId: event.id,
      userId,
      divisionId: member.divisionId,
      ...values,
      wentWell,
      toImprove,
      feedback,
    } as typeof eventCommitteeEvaluations.$inferInsert);
  } catch (error) {
    if (isUniqueViolation(error)) return { already: true };
    console.error("[committee-evaluation] insert failed:", error);
    return { error: "generic" };
  }

  revalidatePath(`/events/${slug}/evaluasi-panitia`);
  revalidatePath(`/console/events/${event.id}`);
  return { ok: true };
}

// Pasang/hapus jendela waktu. Ditujukan untuk tab "Evaluasi Panitia" di konsol
// kegiatan: opensAt/closesAt datang sebagai nilai datetime-local (boleh
// kosong). Kosong dua-duanya = jadwal dilepas (kembali "belum dijadwalkan").
export async function saveCommitteeEvaluationWindow(formData: FormData): Promise<void> {
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")).trim() : "";
  if (!UUID_RE.test(eventId)) return;
  // BPH Panitia acara ini (ketua/wakil/sekretaris/SC) + BPH Kabinet/Teknologi.
  await requireEventConsoleAccess(eventId);

  function parseLocal(value: FormDataEntryValue | null): Date | null {
    if (typeof value !== "string" || !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const opensAt = parseLocal(formData.get("opensAt"));
  const closesAt = parseLocal(formData.get("closesAt"));
  if (opensAt && closesAt && closesAt <= opensAt) return;
  if (closesAt && !opensAt && closesAt.getTime() <= Date.now()) return;

  const [event] = await db
    .select({ slug: events.slug, opensAt: events.committeeEvalOpensAt, closesAt: events.committeeEvalClosesAt })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return;

  await db
    .update(events)
    .set({ committeeEvalOpensAt: opensAt, committeeEvalClosesAt: closesAt })
    .where(eq(events.id, eventId));

  revalidatePath(`/console/events/${eventId}`);
  revalidatePath(`/events/${event.slug}/evaluasi-panitia`);
}

// Hapus satu jawaban (BPH melihat rekap; jawaban salah isi bisa dibersihkan).
export async function deleteCommitteeEvaluation(formData: FormData): Promise<void> {
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")).trim() : "";
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")).trim() : "";
  if (!UUID_RE.test(id) || !UUID_RE.test(eventId)) return;
  await requireEventConsoleAccess(eventId);
  await db
    .delete(eventCommitteeEvaluations)
    .where(and(eq(eventCommitteeEvaluations.id, id), eq(eventCommitteeEvaluations.eventId, eventId)));
  revalidatePath(`/console/events/${eventId}`);
}