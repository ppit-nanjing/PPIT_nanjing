"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { helpArticles, releaseNotes } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) throw new Error("Forbidden");
  return session.user.id;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function upsertHelpArticle(existingId: string | null, formData: FormData) {
  const actorId = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const section = String(formData.get("section") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !section) throw new Error("Judul dan bagian wajib diisi");

  if (existingId) {
    await db
      .update(helpArticles)
      .set({ title, section, content: content || null, updatedAt: new Date() })
      .where(eq(helpArticles.id, existingId));
  } else {
    await db.insert(helpArticles).values({
      title,
      section,
      slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
      content: content || null,
      authorId: actorId,
    });
  }

  revalidatePath("/console/docs");
  redirect("/console/docs");
}

export async function publishReleaseNote(formData: FormData) {
  const actorId = await requireAdmin();
  const version = String(formData.get("version") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!version || !summary) throw new Error("Versi dan ringkasan wajib diisi");

  await db.insert(releaseNotes).values({
    version,
    summary,
    details: String(formData.get("details") ?? "").trim() || null,
    publishedBy: actorId,
  });

  revalidatePath("/console/docs/changelog");
}
