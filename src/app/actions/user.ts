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
  const name = String(formData.get("name") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  await db
    .update(users)
    .set({
      phone: phone || null,
      wechatId: wechatId || null,
      // Name is never nulled out from this form - an empty submission just
      // means "leave it as-is" (the input is pre-filled, so empty is
      // accidental, not a deliberate clear). avatarUrl clearing IS allowed:
      // that's the deliberate "revert to my Google photo" action.
      ...(name ? { name } : {}),
      avatarUrl: avatarUrl || null,
    })
    .where(eq(users.id, session.user.id));
}
