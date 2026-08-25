"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
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

// Inline-validation shape for console news forms - mirrors ShortLinkFormState.
export type ContentFormState = { error?: string };

export async function upsertNewsArticle(
  existingId: string | null,
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const actorId = await requireContentAccess();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const publish = formData.get("publish") === "on";
  // Inline instead of thrown - a thrown Error here would dump the admin into
  // the route error boundary with the whole article lost.
  if (!title) return { error: "Judul wajib diisi." };

  let article: typeof newsArticles.$inferSelect;
  // Only a fresh transition into "published" should email subscribers -
  // re-saving an already-published article (a typo fix, a new cover image)
  // must not spam everyone again. Same guard shape as
  // notifyMembershipDecision's `before?.status !== status` below.
  let wasPublished = false;
  // Preserve the ORIGINAL publish date across unpublish/republish cycles
  // instead of stamping a new one (and treat "has a publish date" as "was
  // ever announced", so republishing a once-emailed article stays silent).
  let previousPublishedAt: Date | null = null;

  if (existingId) {
    const [before] = await db.select({ status: newsArticles.status, publishedAt: newsArticles.publishedAt }).from(newsArticles).where(eq(newsArticles.id, existingId));
    wasPublished = before?.status === "published" || before?.publishedAt != null;
    previousPublishedAt = before?.publishedAt ?? null;
    [article] = await db
      .update(newsArticles)
      .set({
        title,
        content: content || null,
        coverImageUrl: coverImageUrl || null,
        category: category || null,
        status: publish ? "published" : "draft",
        publishedAt: publish ? (previousPublishedAt ?? new Date()) : previousPublishedAt,
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
  const actorId = await requireContentAccess();
  const title = String(formData.get("title") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const driveUrl = String(formData.get("driveUrl") ?? "").trim();
  if (!title) throw new Error("Judul album wajib diisi");
  if (driveUrl && !isValidHttpUrl(driveUrl)) throw new Error("Link Drive tidak valid");

  const [album] = await db
    .insert(galleryAlbums)
    .values({ title, coverImageUrl: coverImageUrl || null, driveUrl: driveUrl || null })
    .returning();

  // Optional batch of photos picked at creation time (MultiPhotoUpload in
  // standalone mode). Only the starred ones become highlights; the rest live
  // on the album's Drive link.
  const entries = parsePhotoEntries(formData.get("photos"));
  if (entries.length > 0) {
    await db.insert(galleryPhotos).values(
      entries.map((e) => ({
        albumId: album.id,
        imageUrl: e.imageUrl,
        caption: null,
        uploadedBy: actorId,
        isHighlight: e.isHighlight,
      })),
    );
  }

  revalidatePath("/console/content");
  revalidatePath("/gallery");
  redirect(`/console/content/gallery/${album.id}`);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// Public gallery pages render only highlighted photos; everything else is
// reached through the album's Drive link. Toggle is per-photo and instant.
export async function setPhotoHighlight(photoId: string, albumId: string, highlight: boolean) {
  await requireContentAccess();
  await db.update(galleryPhotos).set({ isHighlight: highlight }).where(eq(galleryPhotos.id, photoId));
  revalidatePath(`/console/content/gallery/${albumId}`);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${albumId}`);
}

export async function setAlbumDriveUrl(albumId: string, formData: FormData) {
  await requireContentAccess();
  const driveUrl = String(formData.get("driveUrl") ?? "").trim();
  if (driveUrl && !isValidHttpUrl(driveUrl)) throw new Error("Link Drive tidak valid");

  const [album] = await db.select({ id: galleryAlbums.id }).from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();

  await db.update(galleryAlbums).set({ driveUrl: driveUrl || null }).where(eq(galleryAlbums.id, albumId));
  revalidatePath(`/console/content/gallery/${albumId}`);
  revalidatePath(`/gallery/${albumId}`);
}

export async function addGalleryPhoto(albumId: string, formData: FormData) {
  const actorId = await requireContentAccess();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!imageUrl) throw new Error("URL foto wajib diisi");

  await db.insert(galleryPhotos).values({ albumId, imageUrl, caption: caption || null, uploadedBy: actorId });
  revalidatePath(`/console/content/gallery/${albumId}`);
}

// Bulk variant used by MultiPhotoUpload - the client uploads each file to
// /api/upload first, then hands over the resulting blob URLs. URLs are still
// validated server-side: only our own blob host is accepted, so the action
// can't be abused to point album rows at arbitrary origins.
const BLOB_HOST_SUFFIXES = ["blob.vercel-storage.com"];

// Accepts two payload shapes: [{url, highlight}] (new - carries per-photo
// highlight flags from the batch picker) or ["url", ...] (legacy plain list,
// all non-highlight). Invalid entries are dropped silently so one bad URL
// can't sink a whole batch; an empty result is surfaced by the caller.
function parsePhotoEntries(raw: FormDataEntryValue | null): { imageUrl: string; isHighlight: boolean }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }

  const isValidUrl = (u: string) => {
    try {
      return BLOB_HOST_SUFFIXES.some((suffix) => new URL(u).host.endsWith(suffix));
    } catch {
      return false;
    }
  };

  if (!Array.isArray(parsed)) return [];
  const entries: { imageUrl: string; isHighlight: boolean }[] = [];
  for (const item of parsed.slice(0, 100)) {
    if (typeof item === "string") {
      if (isValidUrl(item)) entries.push({ imageUrl: item.trim(), isHighlight: false });
    } else if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
      const url = (item as { url: string }).url.trim();
      const highlight = Boolean((item as { highlight?: unknown }).highlight);
      if (isValidUrl(url)) entries.push({ imageUrl: url, isHighlight: highlight });
    }
    if (entries.length >= 100) break;
  }
  return entries;
}

export async function addGalleryPhotos(albumId: string, formData: FormData) {
  const actorId = await requireContentAccess();

  const [album] = await db.select({ id: galleryAlbums.id }).from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();

  const entries = parsePhotoEntries(formData.get("photos") ?? formData.get("urls"));
  if (entries.length === 0) throw new Error("Tidak ada URL foto yang valid");

  await db.insert(galleryPhotos).values(
    entries.map((e) => ({
      albumId,
      imageUrl: e.imageUrl,
      caption: null,
      uploadedBy: actorId,
      isHighlight: e.isHighlight,
    })),
  );
  revalidatePath(`/console/content/gallery/${albumId}`);
}

export async function deleteGalleryPhoto(photoId: string, albumId: string) {
  await requireContentAccess();
  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, photoId));
  revalidatePath(`/console/content/gallery/${albumId}`);
}
