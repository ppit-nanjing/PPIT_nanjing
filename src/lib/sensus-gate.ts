import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { sensusProfiles } from "@/db/schema";

// Applying to a job, requesting to borrow equipment, and registering for an
// event all require a verified identity first - the org needs to know who's
// actually receiving equipment, showing up, or being hired-referred, not just
// "some Google account". Sensus completion is used as that verification step
// since it's the one place real identity/contact data is collected.
export async function requireCompletedSensus(returnTo: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login`);

  const [profile] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, session.user.id));
  if (profile?.completionStatus !== "complete") {
    redirect(`/sensus?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}

export async function hasCompletedSensus(userId: string): Promise<boolean> {
  const [profile] = await db.select().from(sensusProfiles).where(eq(sensusProfiles.userId, userId));
  return profile?.completionStatus === "complete";
}
