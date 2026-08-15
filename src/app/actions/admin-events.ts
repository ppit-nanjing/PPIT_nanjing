"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { createNotification } from "@/lib/notifications";

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
      status: "draft",
      createdBy: actorId,
    })
    .returning();

  redirect(`/console/events/${created.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

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
      status: String(formData.get("status") ?? "draft") as (typeof events.status.enumValues)[number],
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
    await createNotification({
      userId: registration.userId,
      title: "Kehadiran terkonfirmasi",
      body: `Kehadiran kamu di "${event?.title ?? "acara"}" telah dicatat. Terima kasih sudah hadir!`,
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
    await createNotification({
      userId: registration.userId,
      title: "Kehadiran terkonfirmasi",
      body: `Kehadiran kamu di "${event?.title ?? "acara"}" telah dicatat. Terima kasih sudah hadir!`,
      relatedEntityType: "event_registration",
      relatedEntityId: registration.id,
    });
  }

  return { ok: true as const, already: false as const };
}
