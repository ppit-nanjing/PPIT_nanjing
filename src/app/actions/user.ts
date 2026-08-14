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
