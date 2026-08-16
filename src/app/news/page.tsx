import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { Reveal } from "@/components/reveal";
import { FilterTabs } from "@/components/filter-tabs";
import { NewsCard } from "@/components/news-card";
import { Newspaper, ArrowRight } from "lucide-react";
import Image from "next/image";

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

  const allPublished = await db
    .select({ category: newsArticles.category })
    .from(newsArticles)
    .where(eq(newsArticles.status, "published"));
  const categories = [
    ...new Set(allPublished.map((a) => a.category).filter((c): c is string => !!c)),
  ];

  const filterOptions = [
    { key: "all", label: "Semua", href: "/news", active: !category },
    ...categories.map((c) => ({
      key: c,
      label: c,
      href: `/news?category=${encodeURIComponent(c)}`,
      active: category === c,
    })),
  ];

  const [featured, ...rest] = articles;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-outline-variant">
        <div className="max-w-2xl">
          <AnimatedHeroHeading
            words={["Berita"]}
            className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
          />
          <AnimatedRevealText text="Kabar terbaru seputar kegiatan dan perkembangan PPIT Nanjing." />
        </div>
        {categories.length > 0 && <FilterTabs options={filterOptions} layoutId="news-filter-pill" />}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12 flex flex-col gap-16">
        {articles.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center text-center py-24">
              <Newspaper className="text-outline-variant mb-4" size={40} />
              <p className="text-body-md text-on-surface-variant">
                {category
                  ? "Belum ada berita untuk kategori ini."
                  : "Belum ada berita yang dipublikasikan."}
              </p>
            </div>
          </Reveal>
        ) : (
          <>
            <section>
              <Reveal>
                <a
                  href={`/news/${featured.slug}`}
                  className="group grid grid-cols-1 lg:grid-cols-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative h-64 lg:h-auto bg-surface-container-low overflow-hidden">
                    {featured.coverImageUrl ? (
                      <Image
                        src={featured.coverImageUrl}
                        alt={featured.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
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
                      <p className="text-body-md text-on-surface-variant line-clamp-3 mb-6">
                        {featured.content}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      {featured.publishedAt && (
                        <p className="text-label-caps text-secondary uppercase">
                          {new Date(featured.publishedAt).toLocaleDateString("id-ID", {
                            dateStyle: "long",
                          })}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container">
                        Baca selengkapnya <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </a>
              </Reveal>
            </section>

            {rest.length > 0 && (
              <section className="flex flex-col gap-8">
                <Reveal>
                  <h2 className="text-headline-lg text-on-background border-b border-outline-variant pb-6">
                    Artikel Lainnya
                  </h2>
                </Reveal>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((a, i) => (
                    <NewsCard
                      key={a.id}
                      index={i}
                      article={{
                        id: a.id,
                        slug: a.slug,
                        title: a.title,
                        content: a.content,
                        coverImageUrl: a.coverImageUrl,
                        category: a.category,
                        publishedAt: a.publishedAt,
                      }}
                    />
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
