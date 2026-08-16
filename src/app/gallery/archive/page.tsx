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

export default async function GalleryArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year } = await searchParams;
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
    { key: "all", label: "Semua", href: "/gallery/archive", active: !year },
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
          words={["Arsip", "Galeri"]}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
        />
        <AnimatedRevealText text="Jelajahi dokumentasi kegiatan PPIT Nanjing dari tahun ke tahun." />
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {years.length > 0 && <FilterTabs options={filterOptions} layoutId="gallery-year-pill" className="mb-10" />}

        {filtered.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center text-center py-24">
              <Images className="text-outline-variant mb-4" size={40} />
              <p className="text-body-md text-on-surface-variant">
                {year ? `Tidak ada album di tahun ${year}.` : "Belum ada album yang dipublikasikan."}
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
