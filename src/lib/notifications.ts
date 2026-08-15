import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

// In-app notifications only (no email - there is no sending provider). Backs the
// /notifications page + nav bell. Triggered from admin status changes that affect
// a specific user (borrow approve/reject, event check-in).
export async function createNotification(input: NotificationInput) {
  if (!input.userId) return;
  await db.insert(notifications).values({
    userId: input.userId,
    title: input.title,
    body: input.body,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
  });
}

export async function listNotifications(userId: string, limit = 50) {
  if (!userId) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return row?.count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  if (!userId) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}
