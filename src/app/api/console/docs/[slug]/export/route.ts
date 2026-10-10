import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { hasModuleAccess } from "@/lib/admin-scope-constants";
import { db } from "@/db";
import { helpArticles, users } from "@/db/schema";
import { helpArticleToDocx } from "@/lib/help-article-docx";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  // Route handler, jadi gerbangnya balas 403 alih-alih melempar redirect
  // seperti requireModuleAccess(). Modulnya sama dengan halaman Help Center:
  // "guidebook" (pengurus memisahkannya dari "content" pada 2026-10-11).
  if (!session || !hasModuleAccess(session.user.adminScope, "guidebook")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { slug } = await params;
  const [row] = await db
    .select({ article: helpArticles, authorName: users.name })
    .from(helpArticles)
    .leftJoin(users, eq(helpArticles.authorId, users.id))
    .where(eq(helpArticles.slug, slug));
  if (!row) return new Response("Not found", { status: 404 });

  const buffer = await helpArticleToDocx(row.article, row.authorName);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="panduan-${slug}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
