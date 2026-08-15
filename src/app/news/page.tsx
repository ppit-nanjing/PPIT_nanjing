import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Newspaper } from "lucide-react";

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const conditions = [eq(newsArticles.status, "published")];
  if (category) conditions.push(eq(newsArticles.category, category));

  const articles = await db
    .select()
    .from(newsArticles)
    .where(and(...conditions))
    .orderBy(desc(newsArticles.publishedAt));

  const allPublished = await db.select({ category: newsArticles.category }).from(newsArticles).where(eq(newsArticles.status, "published"));
  const categories = [...new Set(allPublished.map((a) => a.category).filter((c): c is string => !!c))];

  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-outline-variant">
        <div className="max-w-2xl">
          <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Berita</h1>
          <p className="text-body-lg text-on-surface-variant">
            Kabar terbaru seputar kegiatan dan perkembangan PPIT Nanjing.
          </p>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <a
              href="/news"
              className={`px-5 py-2.5 rounded-lg text-label-caps uppercase tracking-wide transition-colors ${
                !category
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-lowest border border-outline-variant text-on-background hover:bg-surface-container-low"
              }`}
            >
              Semua
            </a>
            {categories.map((c) => (
              <a
                key={c}
                href={`/news?category=${encodeURIComponent(c)}`}
                className={`px-5 py-2.5 rounded-lg text-label-caps uppercase tracking-wide transition-colors ${
                  category === c
                    ? "bg-primary-container text-on-primary"
                    : "bg-surface-container-lowest border border-outline-variant text-on-background hover:bg-surface-container-low"
                }`}
              >
                {c}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Newspaper className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">
              {category ? "Belum ada berita untuk kategori ini." : "Belum ada berita yang dipublikasikan."}
            </p>
          </div>
        ) : (
          <>
            <section>
              <a
                href={`/news/${featured.slug}`}
                className="group grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
              >
                <div className="h-64 lg:h-auto bg-surface-container-low overflow-hidden">
                  {featured.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.coverImageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="text-outline-variant" size={40} />
                    </div>
                  )}
                </div>
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  {featured.category && (
                    <span className="inline-block w-fit bg-primary-container/10 text-primary-container text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-lg mb-4">
                      {featured.category}
                    </span>
                  )}
                  <h2 className="text-headline-lg text-on-background mb-4 group-hover:text-primary-container transition-colors">
                    {featured.title}
                  </h2>
                  {featured.content && (
                    <p className="text-body-md text-on-surface-variant line-clamp-3 mb-4">{featured.content}</p>
                  )}
                  {featured.publishedAt && (
                    <p className="text-label-caps text-secondary uppercase">
                      {new Date(featured.publishedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                    </p>
                  )}
                </div>
              </a>
            </section>

            {rest.length > 0 && (
              <section className="flex flex-col gap-8">
                <h2 className="text-headline-lg text-on-background border-b border-outline-variant pb-6">
                  Artikel Lainnya
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((a) => (
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
                        <div className="flex items-center gap-2 mb-2">
                          {a.category && (
                            <span className="text-label-caps text-primary-container uppercase">{a.category}</span>
                          )}
                          {a.category && a.publishedAt && <span className="text-secondary">&bull;</span>}
                          <p className="text-label-caps text-on-surface-variant uppercase">
                            {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID") : ""}
                          </p>
                        </div>
                        <h3 className="text-headline-md text-on-background mb-2">{a.title}</h3>
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
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
