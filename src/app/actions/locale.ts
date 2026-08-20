"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";

// Called directly from client components (src/lib/i18n/client.tsx), not via a
// <form action>, so it takes the value straight rather than FormData - same
// shape as setEmailSubscription() in src/app/actions/user.ts. Kept separate
// from updateProfile(): language is a display setting, not profile data, and
// this action is reachable while logged out (cookie-only, no auth required).
export async function setLocale(next: Locale) {
  if (!isLocale(next)) return; // this is a public server action - don't trust the input

  const c = await cookies();
  c.set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await db.update(users).set({ locale: next }).where(eq(users.id, session.user.id));
  }

  // Re-renders every server component with the new locale, including layout
  // (where getT() is read once and handed down).
  revalidatePath("/", "layout");
}
