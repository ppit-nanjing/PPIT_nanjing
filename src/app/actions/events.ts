"use server";

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { createTemplatedNotification } from "@/lib/notifications";

export async function registerForEvent(eventId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=/events/${slug}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  // Event is unpublished, closed, finished, or cancelled - don't throw here
  // (a raw Error inside a Server Action surfaces as a generic #441 in prod).
  // Bounce back to the event page, which already shows the right message.
  if (!event || event.status !== "published") redirect(`/events/${slug}`);

  // By default events only need login. Sensus (verified Indonesian student in
  // China) is only required when the event opts in via requiresSensus.
  if (event.requiresSensus && !(await hasCompletedSensus(session.user.id))) {
    redirect(`/sensus?returnTo=/events/${slug}`);
  }

  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, session.user.id)));

  if (!existing) {
    await db.insert(eventRegistrations).values({
      eventId,
      userId: session.user.id,
      status: "confirmed",
      qrCodeToken: randomUUID(),
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
