import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, newsArticles, galleryAlbums, jobPostings } from "@/db/schema";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ppit-nanjing.vercel.app";

/**
 * Static public pages that are always indexable. Excludes auth flows, admin
 * console, user-specific pages, success pages, and the link shortener.
 */
const STATIC_PAGES: { url: string; priority: number; changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
  { url: "/", priority: 1.0, changeFrequency: "daily" },
  { url: "/about", priority: 0.8, changeFrequency: "monthly" },
  { url: "/events", priority: 0.9, changeFrequency: "daily" },
  { url: "/news", priority: 0.8, changeFrequency: "daily" },
  { url: "/gallery", priority: 0.7, changeFrequency: "weekly" },
  { url: "/gallery/archive", priority: 0.5, changeFrequency: "monthly" },
  { url: "/jobs", priority: 0.7, changeFrequency: "daily" },
  { url: "/career", priority: 0.6, changeFrequency: "monthly" },
  { url: "/career/mentorship", priority: 0.5, changeFrequency: "monthly" },
  { url: "/catalogue", priority: 0.6, changeFrequency: "monthly" },
  { url: "/catalogue/donasi", priority: 0.5, changeFrequency: "monthly" },
  { url: "/catalogue/sponsorship", priority: 0.5, changeFrequency: "monthly" },
  { url: "/organization", priority: 0.7, changeFrequency: "monthly" },
  { url: "/organization/branches", priority: 0.5, changeFrequency: "monthly" },
  { url: "/organization/map", priority: 0.5, changeFrequency: "monthly" },
  { url: "/organization/ad-art", priority: 0.4, changeFrequency: "yearly" },
  { url: "/documents", priority: 0.6, changeFrequency: "weekly" },
  { url: "/inventory", priority: 0.5, changeFrequency: "weekly" },
  { url: "/inventory/contribute", priority: 0.4, changeFrequency: "monthly" },
  { url: "/inventory/request-new", priority: 0.3, changeFrequency: "monthly" },
  { url: "/places", priority: 0.6, changeFrequency: "weekly" },
  { url: "/map", priority: 0.5, changeFrequency: "weekly" },
  { url: "/coverage", priority: 0.5, changeFrequency: "monthly" },
  { url: "/universities", priority: 0.5, changeFrequency: "monthly" },
  { url: "/join-us", priority: 0.7, changeFrequency: "monthly" },
  { url: "/search", priority: 0.3, changeFrequency: "daily" },
  { url: "/notifications", priority: 0.3, changeFrequency: "daily" },
  { url: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { url: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.url}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency ?? "monthly" as const,
    priority: p.priority,
  }));

  // Fetch dynamic routes in parallel
  const [publishedEvents, publishedNews, albums, openJobs] = await Promise.all([
    db
      .select({ slug: events.slug })
      .from(events)
      .where(eq(events.status, "published")),
    db
      .select({ slug: newsArticles.slug })
      .from(newsArticles)
      .where(eq(newsArticles.status, "published")),
    db.select({ id: galleryAlbums.id }).from(galleryAlbums),
    db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(eq(jobPostings.status, "open")),
  ]);

  const eventEntries: MetadataRoute.Sitemap = publishedEvents.map((e) => ({
    url: `${SITE_URL}/events/${e.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const newsEntries: MetadataRoute.Sitemap = publishedNews.map((n) => ({
    url: `${SITE_URL}/news/${n.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const albumEntries: MetadataRoute.Sitemap = albums.map((a) => ({
    url: `${SITE_URL}/gallery/${a.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const jobEntries: MetadataRoute.Sitemap = openJobs.map((j) => ({
    url: `${SITE_URL}/jobs/${j.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.5,
  }));

  return [
    ...base,
    ...eventEntries,
    ...newsEntries,
    ...albumEntries,
    ...jobEntries,
  ];
}
