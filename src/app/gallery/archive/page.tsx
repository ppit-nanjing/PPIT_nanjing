import { desc } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { Reveal } from "@/components/reveal";
import { FilterTabs } from "@/components/filter-tabs";
import { GalleryCard } from "@/components/gallery-card";
import { Images } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function GalleryArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
  const { t } = await getT();
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));
  const allPhotos = await db.select().from(galleryPhotos);

  // Real filter derived from actual album dates - the prototype's "cabinet-period"
  // filter has no corresponding concept in the schema (albums aren't linked to a
  // kepengurusan period), so filtering by year is the honest equivalent rather
  // than fabricating a period field with no real data behind it.
  const years = [...new Set(albums.map((a) => a.createdAt.getFullYear()))].sort((a, b) => b - a);
  const filtered = year ? albums.filter((a) => a.createdAt.getFullYear() === Number(year)) : albums;

  const coverFor = (albumId: string) => allPhotos.find((p) => p.albumId === albumId)?.imageUrl;
  const countFor = (albumId: string) => allPhotos.filter((p) => p.albumId === albumId).length;

  const filterOptions = [
    { key: "all", label: t("events.filterAll"), href: "/gallery/archive", active: !year },
    ...years.map((y) => ({
      key: String(y),
      label: String(y),
      href: `/gallery/archive?year=${y}`,
      active: String(year) === String(y),
    })),
  ];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8">
        <AnimatedHeroHeading
          words={[t("gallery.archiveTitle")]}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
        />
        <AnimatedRevealText text={t("gallery.archiveIntro")} />
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {years.length > 0 && <FilterTabs options={filterOptions} layoutId="gallery-year-pill" className="mb-10" />}

        {filtered.length === 0 ? (
          <Reveal>
            <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-24">
              <Images className="text-outline-variant mb-4" size={40} aria-hidden />
              <h2 className="text-headline-md text-on-background mb-2">
                {year ? t("gallery.archiveEmptyYear", { year }) : t("gallery.emptyTitle")}
              </h2>
              <p className="text-body-md text-on-surface-variant max-w-md">
                {year
                  ? t("gallery.archiveEmptyYearDesc")
                  : t("gallery.archiveEmptyAllDesc")}
              </p>
              {year && (
                <Link
                  href="/gallery/archive"
                  className="mt-6 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  {t("gallery.viewAllYears")}
                </Link>
              )}
            </div>
          </Reveal>
        ) : (
          <section aria-label={t("gallery.listLabel")} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((album, i) => (
              <GalleryCard
                key={album.id}
                index={i}
                album={{ id: album.id, title: album.title }}
                cover={album.coverImageUrl ?? coverFor(album.id) ?? null}
                count={countFor(album.id)}
                year={album.createdAt.getFullYear()}
              />
            ))}
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
