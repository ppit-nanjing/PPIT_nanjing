import { and, eq, lte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

// Publishes any event whose scheduledPublishAt has passed and is still in the
// 'scheduled' state. Call this whenever events are read so a due event goes
// live automatically even without an external cron trigger. Idempotent: it only
// touches events that are both scheduled and past their publish time.
export async function publishDueEvents() {
  await db
    .update(events)
    .set({ status: "published" })
    .where(
      and(
        eq(events.status, "scheduled"),
        isNotNull(events.scheduledPublishAt),
        lte(events.scheduledPublishAt, sql`now()`)
      )
    );
}
