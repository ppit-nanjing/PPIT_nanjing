import { eq, ilike, and, or } from "drizzle-orm";
import { db } from "@/db";
import { events, newsArticles, jobPostings, galleryAlbums, inventoryItems } from "@/db/schema";

export type SearchResult = {
  type: "event" | "news" | "job" | "gallery" | "inventory" | "page";
  title: string;
  subtitle?: string;
  href: string;
  locked?: boolean;
};

const STATIC_PAGES: { title: string; href: string }[] = [
  { title: "Struktur Organisasi", href: "/organization" },
  { title: "Cabang Regional", href: "/organization/branches" },
  { title: "Peta Cabang", href: "/organization/map" },
  { title: "AD/ART", href: "/organization/ad-art" },
  { title: "Tentang PPIT", href: "/about" },
];

export async function runGlobalSearch(q: string, hasSensus: boolean): Promise<SearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const pattern = `%${query}%`;
  const [evts, news, jobs, galleries, inventory] = await Promise.all([
    db
      .select({ title: events.title, slug: events.slug, requiresSensus: events.requiresSensus })
      .from(events)
      .where(and(eq(events.status, "published"), ilike(events.title, pattern)))
      .limit(5),
    db
      .select({ title: newsArticles.title, slug: newsArticles.slug })
      .from(newsArticles)
      .where(and(eq(newsArticles.status, "published"), ilike(newsArticles.title, pattern)))
      .limit(5),
    db
      .select({ id: jobPostings.id, title: jobPostings.title, company: jobPostings.company })
      .from(jobPostings)
      .where(and(eq(jobPostings.status, "open"), ilike(jobPostings.title, pattern)))
      .limit(5),
    db
      .select({ title: galleryAlbums.title, id: galleryAlbums.id })
      .from(galleryAlbums)
      .where(ilike(galleryAlbums.title, pattern))
      .limit(5),
    db
      .select({ name: inventoryItems.name })
      .from(inventoryItems)
      .where(or(ilike(inventoryItems.name, pattern), ilike(inventoryItems.category, pattern)))
      .limit(5),
  ]);

  const lower = query.toLowerCase();
  const pages = STATIC_PAGES.filter((p) => p.title.toLowerCase().includes(lower)).map((p) => ({
    type: "page" as const,
    title: p.title,
    href: p.href,
  }));

  return [
    ...evts.map((e) => ({
      type: "event" as const,
      title: e.title,
      subtitle: e.requiresSensus ? "Khusus peserta tersensus" : undefined,
      href: `/events/${e.slug}`,
      locked: e.requiresSensus && !hasSensus,
    })),
    ...news.map((n) => ({
      type: "news" as const,
      title: n.title,
      href: `/news/${n.slug}`,
      locked: false,
    })),
    ...jobs.map((j) => ({
      type: "job" as const,
      title: j.title,
      subtitle: j.company,
      href: `/jobs/${j.id}`,
      locked: !hasSensus,
    })),
    ...galleries.map((g) => ({
      type: "gallery" as const,
      title: g.title,
      href: `/gallery/${g.id}`,
      locked: false,
    })),
    ...inventory.map((i) => ({
      type: "inventory" as const,
      title: i.name,
      href: "/inventory",
      locked: false,
    })),
    ...pages,
  ];
}
