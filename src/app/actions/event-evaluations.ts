"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eventEvaluations, events } from "@/db/schema";
import { requireEventConsoleAccess } from "@/lib/event-access";

export type EventEvaluationFormState = {
  ok?: boolean;
  already?: boolean;
  error?: "ratings" | "invalid" | "generic";
};

const TEXT_MAX = 2000;
const NAME_MAX = 80;
const CITY_MAX = 40;
const TOKEN_MIN = 8;
const TOKEN_MAX = 100;

function optionalText(formData: FormData, key: string, max: number): string | null {
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
    .select({ id: events.id })
    .from(events)
    .where(eq(events.slug, slug));
  if (!event) return { error: "invalid" };

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
      name = optionalText(formData, "name", NAME_MAX);
      city = optionalText(formData, "city", CITY_MAX);
    }
    improveRegistration = optionalText(formData, "improveRegistration", TEXT_MAX);
    improveFacilities = optionalText(formData, "improveFacilities", TEXT_MAX);
    cgtMessage = optionalText(formData, "cgtMessage", TEXT_MAX);
    improveService = optionalText(formData, "improveService", TEXT_MAX);
    overallMessage = optionalText(formData, "overallMessage", TEXT_MAX);
    heartwarming = optionalText(formData, "heartwarming", TEXT_MAX);
  } catch {
    return { error: "invalid" };
  }

  try {
    await db.insert(eventEvaluations).values({
      eventId: event.id,
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

export async function deleteEventEvaluation(formData: FormData): Promise<void> {
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";
  const eventId = typeof formData.get("eventId") === "string" ? String(formData.get("eventId")) : "";
  if (!id || !eventId) return;
  await requireEventConsoleAccess(eventId);
  await db
    .delete(eventEvaluations)
    .where(and(eq(eventEvaluations.id, id), eq(eventEvaluations.eventId, eventId)));
  revalidatePath(`/console/events/${eventId}`);
}
