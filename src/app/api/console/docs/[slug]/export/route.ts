import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { helpArticles, users } from "@/db/schema";
import { helpArticleToDocx } from "@/lib/help-article-docx";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  // Gerbang sama dengan Help Center-nya sendiri (isAdmin longgar, bukan modul
  // baru) - lihat requireAdmin() di admin-docs.ts.
  if (!session?.user?.isAdmin) {
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
