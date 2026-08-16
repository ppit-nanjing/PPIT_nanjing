import { NextRequest, NextResponse } from "next/server";
import { eq, ilike, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, newsArticles, jobPostings, galleryAlbums } from "@/db/schema";
import { hasCompletedSensus } from "@/lib/sensus-gate";

export const dynamic = "force-dynamic";

// Lightweight global search backing the command palette. Surfaces real content
// (events, news, open jobs, galleries) - not just nav links - and marks
// sensus-gated items (jobs, and events flagged requiresSensus) as locked when
// the current user hasn't completed the sensus, so the palette can route them
// to /sensus?returnTo=... instead of a dead end.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const session = await auth();
  const hasSensus = session?.user?.id ? await hasCompletedSensus(session.user.id) : false;

  const pattern = `%${q}%`;
  const [evts, news, jobs, galleries] = await Promise.all([
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
  ]);

  const results = [
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
  ];

  return NextResponse.json({ results });
}
