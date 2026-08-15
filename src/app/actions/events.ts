"use server";

import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { events, eventRegistrations } from "@/db/schema";
import { requireCompletedSensus } from "@/lib/sensus-gate";

export async function registerForEvent(eventId: string, slug: string) {
  const session = await requireCompletedSensus(`/events/${slug}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || event.status !== "published") throw new Error("Event tidak tersedia untuk pendaftaran");

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
