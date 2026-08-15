"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function setEmailSubscription(subscribed: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  await db.update(users).set({ emailSubscribed: subscribed }).where(eq(users.id, session.user.id));
}

// Account-level contact fields only - academic/demographic data (university,
// program, birth date, etc.) lives in sensus_profiles via /sensus, edited
// there instead of duplicating fields across two forms.
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const phone = String(formData.get("phone") ?? "").trim();
  const wechatId = String(formData.get("wechatId") ?? "").trim();

  await db
    .update(users)
    .set({ phone: phone || null, wechatId: wechatId || null })
    .where(eq(users.id, session.user.id));
}
