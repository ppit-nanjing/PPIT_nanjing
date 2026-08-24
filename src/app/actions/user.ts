"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const githubUrl = String(formData.get("githubUrl") ?? "").trim();
  const spotifyUrl = String(formData.get("spotifyUrl") ?? "").trim();
  const tiktokUrl = String(formData.get("tiktokUrl") ?? "").trim();

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
      linkedinUrl: linkedinUrl || null,
      instagramUrl: instagramUrl || null,
      githubUrl: githubUrl || null,
      spotifyUrl: spotifyUrl || null,
      tiktokUrl: tiktokUrl || null,
    })
    .where(eq(users.id, session.user.id));

  // Fresh data on the re-render + explicit success signal via query param -
  // without this the page looks untouched and users assume nothing saved.
  revalidatePath("/profile");
  redirect("/profile?saved=1");
}
