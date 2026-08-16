"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { notificationTemplates } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope-constants";
import { getTemplateDef } from "@/lib/notification-templates";

// Full tier only - "notifications" is not delegable via adminModuleScope, since
// this wording goes out to every member. Enforced here and not just in the page
// gate, because a server action is reachable directly regardless of what the
// UI renders.
async function requireFullAdmin() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "notifications")) {
    throw new Error("Forbidden");
  }
  return session!.user.id;
}

export async function upsertNotificationTemplate(key: string, formData: FormData) {
  const actorId = await requireFullAdmin();

  // Only keys that correspond to a real call site may be written - otherwise
  // the table would collect rows that never fire.
  const def = getTemplateDef(key);
  if (!def) throw new Error("Template tidak dikenal");

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyTemplate = String(formData.get("bodyTemplate") ?? "").trim();
  if (!subject || !bodyTemplate) throw new Error("Judul dan isi pesan wajib diisi");

  await db
    .insert(notificationTemplates)
    .values({
      key: def.key,
      channel: "in_app",
      subject,
      bodyTemplate,
      updatedBy: actorId,
    })
    .onConflictDoUpdate({
      target: notificationTemplates.key,
      set: { subject, bodyTemplate, updatedBy: actorId, updatedAt: new Date() },
    });

  revalidatePath("/console/notifications");
}

// Deleting the row is the reset: createTemplatedNotification() falls back to the
// registry default whenever no row exists, so there is no separate "default"
// copy to keep in sync.
export async function resetNotificationTemplate(key: string) {
  await requireFullAdmin();
  const def = getTemplateDef(key);
  if (!def) throw new Error("Template tidak dikenal");

  await db.delete(notificationTemplates).where(eq(notificationTemplates.key, def.key));

  revalidatePath("/console/notifications");
}
