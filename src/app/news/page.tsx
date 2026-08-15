import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Newspaper } from "lucide-react";

export default async function NewsPage() {
  const articles = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.status, "published"))
    .orderBy(desc(newsArticles.publishedAt));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Berita</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Kabar terbaru seputar kegiatan dan perkembangan PPIT Nanjing.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Newspaper className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">Belum ada berita yang dipublikasikan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <a
                key={a.id}
                href={`/news/${a.slug}`}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow flex flex-col"
              >
                {a.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverImageUrl} alt={a.title} className="w-full h-44 object-cover" />
                )}
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-label-caps text-on-surface-variant uppercase mb-2">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID") : ""}
                  </p>
                  <h2 className="text-headline-md text-on-background mb-2">{a.title}</h2>
                  {a.content && (
                    <p className="text-body-md text-on-surface-variant line-clamp-3">
                      {a.content.slice(0, 140)}
                      {a.content.length > 140 ? "…" : ""}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
