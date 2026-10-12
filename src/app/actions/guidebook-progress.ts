"use server";

import { and, eq, isNull, or, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { guidebookProgress, helpArticles } from "@/db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Centang "sudah saya lakukan" satu topik panduan maba. Server action, bukan
 * route handler: efeknya cuma mengubah tampilan halaman ini, dan form-nya
 * jalan tanpa JavaScript.
 *
 * articleId dari form tidak dipercaya. Sebelum menulis, artikelnya dicek dulu
 * di server: harus topik panduan (phase terisi), publik, dan belum kedaluwarsa
 * - syarat yang sama dengan daftar di /guidebook. Tanpa cek ini, id sembarang
 * bisa disisipkan lewat DevTools, termasuk topik internal yang belum ditinjau.
 *
 * Anonim dialihkan ke login dengan returnTo, bukan dilempar galat: menandai
 * progres memang cuma masuk akal kalau ada yang diingat.
 */
export async function toggleGuideProgressAction(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?returnTo=/guidebook");

  const articleId = String(formData.get("articleId") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!UUID_RE.test(articleId)) redirect("/guidebook");

  const [topic] = await db
    .select({ id: helpArticles.id })
    .from(helpArticles)
    .where(
      and(
        eq(helpArticles.id, articleId),
        eq(helpArticles.isPublic, true),
        or(isNull(helpArticles.expiresAt), gt(helpArticles.expiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!topic) redirect("/guidebook");

  if (done) {
    await db.insert(guidebookProgress).values({ userId, articleId }).onConflictDoNothing();
  } else {
    await db
      .delete(guidebookProgress)
      .where(and(eq(guidebookProgress.userId, userId), eq(guidebookProgress.articleId, articleId)));
  }

  revalidatePath("/guidebook");
}
