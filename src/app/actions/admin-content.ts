"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { newsArticles, galleryAlbums, galleryPhotos, users } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { sendEmail } from "@/lib/email";
import { renderMembershipEmail, renderMembershipEmailText } from "@/lib/membership-email";
import { getSiteUrl } from "@/lib/site-url";

async function requireContentAccess() {
  const session = await auth();
  if (!hasModuleAccess(session?.user?.adminScope ?? null, "content")) throw new Error("Forbidden");
  return session!.user.id;
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function upsertNewsArticle(existingId: string | null, formData: FormData) {
  const actorId = await requireContentAccess();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const publish = formData.get("publish") === "on";
  if (!title) throw new Error("Judul wajib diisi");

  let article: typeof newsArticles.$inferSelect;
  // Only a fresh transition into "published" should email subscribers -
  // re-saving an already-published article (a typo fix, a new cover image)
  // must not spam everyone again. Same guard shape as
  // notifyMembershipDecision's `before?.status !== status` below.
  let wasPublished = false;

  if (existingId) {
    const [before] = await db.select({ status: newsArticles.status }).from(newsArticles).where(eq(newsArticles.id, existingId));
    wasPublished = before?.status === "published";
    [article] = await db
      .update(newsArticles)
      .set({
        title,
        content: content || null,
        coverImageUrl: coverImageUrl || null,
        category: category || null,
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
      })
      .where(eq(newsArticles.id, existingId))
      .returning();
  } else {
    [article] = await db
      .insert(newsArticles)
      .values({
        title,
        slug: slugify(title),
        content: content || null,
        coverImageUrl: coverImageUrl || null,
        category: category || null,
        authorId: actorId,
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
      })
      .returning();
  }

  if (publish && !wasPublished) {
    await notifyNewsSubscribers(article);
  }

  revalidatePath("/console/content");
  redirect("/console/content");
}

// Fans out to every member who opted in via the profile "Email Subscribed"
// toggle (session.user.emailSubscribed - previously captured but never read
// anywhere). sendEmail() never throws (it catches provider errors and
// returns a SendResult), so a failed/skipped send for one recipient can't
// stop the rest or roll back the publish that triggered it.
async function notifyNewsSubscribers(article: typeof newsArticles.$inferSelect) {
  const subscribers = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.emailSubscribed, true), eq(users.status, "active")));
  if (subscribers.length === 0) return;

  const excerpt = (article.content ?? "").split(/\n{2,}/)[0]?.trim().slice(0, 280) ?? "";
  const url = `${getSiteUrl()}/news/${article.slug}`;
  const emailInput = {
    subject: article.title,
    html: renderMembershipEmail({
      heading: article.title,
      body: excerpt,
      ctaLabel: "Baca selengkapnya",
      ctaUrl: url,
      footerNote: "Kamu menerima email ini karena berlangganan pengumuman PPIT Nanjing. Matikan lewat halaman Profil kapan saja.",
    }),
    text: renderMembershipEmailText({ heading: article.title, body: excerpt, ctaLabel: "Baca selengkapnya", ctaUrl: url }),
  };

  await Promise.all(subscribers.map((s) => sendEmail({ to: s.email, ...emailInput })));
}

export async function createGalleryAlbum(formData: FormData) {
  await requireContentAccess();
  const title = String(formData.get("title") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  if (!title) throw new Error("Judul album wajib diisi");

  const [album] = await db
    .insert(galleryAlbums)
    .values({ title, coverImageUrl: coverImageUrl || null })
    .returning();

  redirect(`/console/content/gallery/${album.id}`);
}

export async function addGalleryPhoto(albumId: string, formData: FormData) {
  const actorId = await requireContentAccess();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!imageUrl) throw new Error("URL foto wajib diisi");

  await db.insert(galleryPhotos).values({ albumId, imageUrl, caption: caption || null, uploadedBy: actorId });
  revalidatePath(`/console/content/gallery/${albumId}`);
}

export async function deleteGalleryPhoto(photoId: string, albumId: string) {
  await requireContentAccess();
  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, photoId));
  revalidatePath(`/console/content/gallery/${albumId}`);
}
