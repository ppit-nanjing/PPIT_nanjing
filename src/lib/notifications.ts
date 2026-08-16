import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, notificationTemplates } from "@/db/schema";
import {
  getTemplateDef,
  renderTemplate,
  type NotificationTemplateKey,
} from "@/lib/notification-templates";

export type NotificationInput = {
  userId: string;
  title: string;
  body: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type TemplatedNotificationInput = {
  userId: string;
  templateKey: NotificationTemplateKey;
  variables?: Record<string, string>;
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

// Preferred entry point for the notifications the app sends on a fixed trigger
// (see src/lib/notification-templates.ts). Admin-edited wording in
// notification_templates wins; when no row exists the registry default is used,
// so this never fails closed and never sends an empty message. templateId is
// recorded only when a real DB row backed the text, keeping the FK honest.
export async function createTemplatedNotification(input: TemplatedNotificationInput) {
  if (!input.userId) return;
  const def = getTemplateDef(input.templateKey);
  if (!def) return;

  const [row] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.key, input.templateKey))
    .limit(1);

  const subject = row?.subject?.trim() || def.defaultSubject;
  const body = row?.bodyTemplate?.trim() || def.defaultBody;

  await db.insert(notifications).values({
    userId: input.userId,
    templateId: row?.id ?? null,
    title: renderTemplate(subject, input.variables),
    body: renderTemplate(body, input.variables),
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
