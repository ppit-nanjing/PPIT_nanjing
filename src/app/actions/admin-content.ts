"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { newsArticles, galleryAlbums, galleryPhotos } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";

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
  const publish = formData.get("publish") === "on";
  if (!title) throw new Error("Judul wajib diisi");

  if (existingId) {
    await db
      .update(newsArticles)
      .set({
        title,
        content: content || null,
        coverImageUrl: coverImageUrl || null,
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
      })
      .where(eq(newsArticles.id, existingId));
  } else {
    await db.insert(newsArticles).values({
      title,
      slug: slugify(title),
      content: content || null,
      coverImageUrl: coverImageUrl || null,
      authorId: actorId,
      status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : null,
    });
  }

  revalidatePath("/console/content");
  redirect("/console/content");
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
