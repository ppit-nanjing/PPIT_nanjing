import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";

// Looked up once per console page render by GuideButton's caller - a single
// indexed lookup by the unique slug, cheap enough not to need caching.
// Returns null (button just doesn't render) rather than throwing, so a page
// never breaks because its guide hasn't been written/seeded yet.
export async function getGuide(slug: string): Promise<{ title: string; content: string } | null> {
  const [row] = await db
    .select({ title: helpArticles.title, content: helpArticles.content })
    .from(helpArticles)
    .where(eq(helpArticles.slug, slug))
    .limit(1);
  if (!row) return null;
  return { title: row.title, content: row.content ?? "" };
}
