import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";

export const dynamic = "force-dynamic";

const NOT_FOUND_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8" />
<title>Tautan tidak ditemukan</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f6f4;color:#1b1b1b;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}main{background:#fff;border:1px solid #e2e2dd;border-radius:16px;padding:40px;max-width:440px;text-align:center}h1{margin:0 0 8px;font-size:22px}a{color:#1b1b1b;text-decoration:underline}</style>
</head><body><main><h1>Tautan tidak valid</h1><p>Tautan pendek ini tidak ditemukan, sudah dinonaktifkan, atau sudah kedaluwarsa.</p><p><a href="/">Kembali ke beranda PPIT Nanjing</a></p></main></body></html>`;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();

  const [link] = await db
    .select()
    .from(shortLinks)
    .where(eq(shortLinks.slug, decoded))
    .limit(1);

  const now = new Date();
  const inactive = !link || !link.isActive;
  const expired = link?.expiresAt ? link.expiresAt.getTime() <= now.getTime() : false;

  if (inactive || expired || !link || !isValidHttpUrl(link.targetUrl)) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  // Click tracking — await so the count persists before we redirect.
  await db
    .update(shortLinks)
    .set({ clickCount: sql`${shortLinks.clickCount} + 1` })
    .where(eq(shortLinks.id, link.id));

  const target = new URL(link.targetUrl);
  // Forward any incoming query string so forms/surveys keep their params.
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((value, key) => {
    if (!target.searchParams.has(key)) target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target.toString(), { status: 302 });
}
