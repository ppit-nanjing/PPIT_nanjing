"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, galleryAlbums } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createTemplatedNotification } from "@/lib/notifications";

async function requireAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "events")) throw new Error("Forbidden");
  return session!.user.id;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function createEvent(formData: FormData) {
  const actorId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

  const scheduledPublishAt = formData.get("scheduledPublishAt")
    ? new Date(String(formData.get("scheduledPublishAt")))
    : null;
  // When a publish schedule is set, the event stays in a 'scheduled' state
  // (hidden from the public) until its time arrives, instead of a plain draft.
  const status: (typeof events.status.enumValues)[number] = scheduledPublishAt
    ? "scheduled"
    : "draft";

  const [created] = await db
    .insert(events)
    .values({
      title,
      slug: slugify(title),
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      registrationDeadline: formData.get("registrationDeadline")
        ? new Date(String(formData.get("registrationDeadline")))
        : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      requiresSensus: formData.get("requiresSensus") === "on",
      agenda: String(formData.get("agenda") ?? "").trim() || null,
      status,
      scheduledPublishAt,
      createdBy: actorId,
    })
    .returning();

  redirect(`/console/events/${created.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

  const scheduledPublishAt = formData.get("scheduledPublishAt")
    ? new Date(String(formData.get("scheduledPublishAt")))
    : null;
  let status = String(formData.get("status") ?? "draft") as (typeof events.status.enumValues)[number];
  // If a publish schedule is set but the admin left it as a draft, move it to
  // the 'scheduled' state so it auto-publishes when the time arrives.
  if (scheduledPublishAt && status === "draft") status = "scheduled";

  await db
    .update(events)
    .set({
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      registrationDeadline: formData.get("registrationDeadline")
        ? new Date(String(formData.get("registrationDeadline")))
        : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      requiresSensus: formData.get("requiresSensus") === "on",
      agenda: String(formData.get("agenda") ?? "").trim() || null,
      status,
      scheduledPublishAt,
    })
    .where(eq(events.id, id));

  revalidatePath(`/console/events/${id}`);
}

export async function checkInRegistration(registrationId: string, eventId: string) {
  await requireAdmin();
  const [registration] = await db
    .select({ userId: eventRegistrations.userId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, registrationId));
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registrationId));

  if (registration?.userId) {
    await createTemplatedNotification({
      userId: registration.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_registration",
      relatedEntityId: registrationId,
    });
  }

  revalidatePath(`/console/events/${eventId}`);
}

// Check-in by the QR token scanned from a ticket. Separated from the scan page
// render so the db write happens in a server action (triggered client-side
// after the page loads) rather than during the Server Component render - doing
// a mutation inside a render breaks RSC streaming in production.
export async function checkInByToken(token: string, eventId: string) {
  await requireAdmin();

  const [registration] = await db
    .select({ id: eventRegistrations.id, userId: eventRegistrations.userId, status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.qrCodeToken, token), eq(eventRegistrations.eventId, eventId)));

  if (!registration) return { ok: false as const };

  if (registration.status === "attended") {
    return { ok: true as const, already: true as const };
  }

  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registration.id));

  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
  if (registration.userId) {
    await createTemplatedNotification({
      userId: registration.userId,
      templateKey: "event_checkin",
      variables: { eventTitle: event?.title ?? "acara" },
      relatedEntityType: "event_registration",
      relatedEntityId: registration.id,
    });
  }

  return { ok: true as const, already: false as const };
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  // galleryAlbums.eventId has no FK cascade, so delete albums (and their photos
  // via cascade) first; eventRegistrations cascade from events automatically.
  await db.delete(galleryAlbums).where(eq(galleryAlbums.eventId, eventId));
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/console/events");
  redirect("/console/events");
}
