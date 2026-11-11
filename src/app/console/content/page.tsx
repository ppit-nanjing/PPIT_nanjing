import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { events, galleryAlbums, galleryPhotos, newsArticles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { eventDayLabel } from "@/lib/event-stage";
import { getGuide } from "@/lib/guides";
import { GuideButton } from "@/components/console/guide-button";
import { FlashToast } from "@/components/console/flash-toast";
import { ContentBoard, type BoardAlbum, type BoardArticle } from "@/components/console/content-board";

export const metadata: Metadata = { title: "Konten" };

function articleDateLabel(status: BoardArticle["status"], publishedAt: Date | null): string {
  const day = publishedAt ? eventDayLabel(publishedAt) : null;
  if (status === "published") return day ? `Terbit ${day}` : "Terbit";
  if (status === "archived") return day ? `Diarsipkan · terbit ${day}` : "Diarsipkan";
  return day ? `Ditarik ke draf · terbit ${day}` : "Belum pernah terbit";
}

export default async function ConsoleContentPage({ searchParams }: PageProps<"/console/content">) {
  await requireModuleAccess("content");

  const [params, articleRows, albumRows, guide] = await Promise.all([
    searchParams,
    // NULLS LAST: draf (publishedAt null) tidak boleh mengapung di atas berita yang sudah terbit.
    db
      .select({
        id: newsArticles.id,
        slug: newsArticles.slug,
        title: newsArticles.title,
        content: newsArticles.content,
        coverImageUrl: newsArticles.coverImageUrl,
        category: newsArticles.category,
        status: newsArticles.status,
        publishedAt: newsArticles.publishedAt,
        author: users.name,
        eventTitle: events.title,
      })
      .from(newsArticles)
      .leftJoin(users, eq(newsArticles.authorId, users.id))
      .leftJoin(events, eq(newsArticles.eventId, events.id))
      .orderBy(sql`${newsArticles.publishedAt} desc nulls last`, asc(newsArticles.title)),
    // Sampul mengikuti /gallery: sampul album, lalu foto sorotan pertama. Di konsol foto biasa
    // pertama ikut jadi cadangan supaya album tanpa sorotan tetap mudah dikenali.
    db
      .select({
        id: galleryAlbums.id,
        title: galleryAlbums.title,
        coverImageUrl: galleryAlbums.coverImageUrl,
        driveUrl: galleryAlbums.driveUrl,
        createdAt: galleryAlbums.createdAt,
        eventTitle: events.title,
        photoCount: sql<number>`count(${galleryPhotos.id})::int`,
        highlightCount: sql<number>`(count(${galleryPhotos.id}) filter (where ${galleryPhotos.isHighlight}))::int`,
        firstHighlight: sql<string | null>`(array_agg(${galleryPhotos.imageUrl} order by ${galleryPhotos.uploadedAt}) filter (where ${galleryPhotos.isHighlight}))[1]`,
        firstPhoto: sql<string | null>`(array_agg(${galleryPhotos.imageUrl} order by ${galleryPhotos.uploadedAt}))[1]`,
      })
      .from(galleryAlbums)
      .leftJoin(events, eq(galleryAlbums.eventId, events.id))
      .leftJoin(galleryPhotos, eq(galleryPhotos.albumId, galleryAlbums.id))
      .groupBy(galleryAlbums.id, events.title)
      .orderBy(desc(galleryAlbums.createdAt)),
    getGuide("konten"),
  ]);

  const latestId = articleRows.find((a) => a.status === "published")?.id;
  const articles: BoardArticle[] = articleRows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    coverImageUrl: a.coverImageUrl,
    category: a.category,
    status: a.status,
    excerpt: a.id === latestId ? a.content?.slice(0, 280) ?? null : null,
    dateLabel: articleDateLabel(a.status, a.publishedAt),
    author: a.author,
    eventTitle: a.eventTitle,
  }));

  const albums: BoardAlbum[] = albumRows.map((a) => ({
    id: a.id,
    title: a.title,
    cover: a.coverImageUrl ?? a.firstHighlight ?? a.firstPhoto,
    photoCount: a.photoCount,
    highlightCount: a.highlightCount,
    eventTitle: a.eventTitle,
    hasDriveUrl: !!a.driveUrl,
    createdLabel: eventDayLabel(a.createdAt),
  }));

  const button = "inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors";

  return (
    <div className="px-3 py-4 sm:px-6 lg:px-8 lg:py-10">
      <FlashToast />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Konten</h1>
          <p className="mt-1 max-w-[62ch] text-body-md text-on-surface-variant">Berita dan album foto yang tampil di situs publik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {guide && <GuideButton title={guide.title} content={guide.content} docSlug="konten" />}
          <Link href="/console/content/gallery/new" className={`${button} border border-outline-variant text-on-background hover:bg-surface-container-low`}>
            <Plus size={15} aria-hidden /> Album Baru
          </Link>
          <Link href="/console/content/news/new" className={`${button} bg-primary-container text-on-primary hover:bg-primary`}>
            <Plus size={15} aria-hidden /> Tulis Berita
          </Link>
        </div>
      </div>

      <ContentBoard articles={articles} albums={albums} initialTab={params.tab === "galeri" ? "galeri" : "berita"} />
    </div>
  );
}
