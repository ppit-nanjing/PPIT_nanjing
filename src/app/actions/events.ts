"use server";

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations, regionalBranches } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { NON_STUDENT_BRANCH } from "@/lib/membership-status";
import { createTemplatedNotification } from "@/lib/notifications";

// Peserta yang sensusnya belum lengkap ditanyai asal cabangnya di form
// pendaftaran (lihat komentar di event_registrations.branch). Nilainya
// dicocokkan ke direktori cabang supaya kolomnya tidak jadi tempat sampah teks
// bebas; yang tidak dikenali dibuang, bukan disimpan apa adanya.
async function normalizeRegistrationBranch(raw: FormDataEntryValue | null): Promise<string | null> {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (value === NON_STUDENT_BRANCH) return value;
  const known = await db
    .select({ cityName: regionalBranches.cityName })
    .from(regionalBranches)
    .where(eq(regionalBranches.cityName, value));
  return known.length > 0 ? value : null;
}

export async function registerForEvent(eventId: string, slug: string, formData?: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=/events/${slug}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  // Event is unpublished, closed, finished, or cancelled - don't throw here
  // (a raw Error inside a Server Action surfaces as a generic #441 in prod).
  // Bounce back to the event page, which already shows the right message.
  if (!event || event.status !== "published") redirect(`/events/${slug}`);

  // By default events only need login. Sensus (verified Indonesian student in
  // China) is only required when the event opts in via requiresSensus.
  const sensusComplete = await hasCompletedSensus(session.user.id);
  if (event.requiresSensus && !sensusComplete) {
    redirect(`/sensus?returnTo=/events/${slug}`);
  }

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)));

  if (!existing) {
    // Hanya disimpan untuk peserta yang sensusnya belum lengkap. Kalau sensusnya
    // lengkap, cabangnya sudah diketahui dari sana dan itu sumber yang lebih
    // berwenang - menyalinnya ke sini cuma bikin dua nilai yang bisa berselisih.
    const branch = sensusComplete ? null : await normalizeRegistrationBranch(formData?.get("branch") ?? null);

    await db.insert(eventRegistrations).values({
      eventId,
      userId: session.user.id,
      status: "confirmed",
      qrCodeToken: randomUUID(),
      branch,
    });
    // In-app confirmation for the member who just registered.
    await createTemplatedNotification({
      userId: session.user.id,
      templateKey: "event_registration",
      variables: { eventTitle: event.title },
      relatedEntityType: "event",
      relatedEntityId: eventId,
    });
  }

  redirect(`/events/${slug}/ticket`);
}
