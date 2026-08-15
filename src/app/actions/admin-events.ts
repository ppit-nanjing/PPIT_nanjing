"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

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
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
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
      startAt: formData.get("startAt") ? new Date(String(formData.get("startAt"))) : null,
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      status: String(formData.get("status") ?? "draft") as (typeof events.status.enumValues)[number],
    })
    .where(eq(events.id, id));

  revalidatePath(`/console/events/${id}`);
}

export async function checkInRegistration(registrationId: string, eventId: string) {
  await requireAdmin();
  await db
    .update(eventRegistrations)
    .set({ status: "attended", checkedInAt: new Date() })
    .where(eq(eventRegistrations.id, registrationId));
  revalidatePath(`/console/events/${eventId}`);
}
