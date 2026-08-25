"use server";

import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { feedback, type feedbackCategoryEnum, type feedbackStatusEnum } from "@/db/schema";

export interface SubmitFeedbackInput {
  category: (typeof feedbackCategoryEnum.enumValues)[number];
  message: string;
  pagePath: string;
  elementSelector: string | null;
  elementDescription: string | null;
  elementRect: { x: number; y: number; width: number; height: number } | null;
  viewport: { width: number; height: number };
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  const session = await auth();

  await db.insert(feedback).values({
    category: input.category,
    message: input.message,
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
    pagePath: input.pagePath,
    elementSelector: input.elementSelector,
    elementDescription: input.elementDescription,
    elementRect: input.elementRect,
    viewport: input.viewport,
  });
}

async function assertAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
}

export async function listFeedback() {
  await assertAdmin();
  // Unbounded table scan - cap at the newest entries so a long-lived deployment
  // can't make this page (and its client-side filters) crawl.
  return db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(200);
}

export async function updateFeedbackStatus(id: string, status: (typeof feedbackStatusEnum.enumValues)[number]) {
  await assertAdmin();
  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
}
