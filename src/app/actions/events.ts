"use server";

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";

export async function registerForEvent(eventId: string, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=/events/${slug}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || event.status !== "published") throw new Error("Event tidak tersedia untuk pendaftaran");

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
  }

  redirect(`/events/${slug}/ticket`);
}
