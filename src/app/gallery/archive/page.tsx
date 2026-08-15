import { desc } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Images, Filter } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Arsip Galeri</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Jelajahi dokumentasi kegiatan PPIT Nanjing dari tahun ke tahun.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {years.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-10">
            <span className="flex items-center gap-1 text-label-caps text-on-surface-variant uppercase mr-2">
              <Filter size={14} /> Tahun
            </span>
            <a
              href="/gallery/archive"
              className={`text-label-caps uppercase px-3 py-1.5 rounded-md transition-colors ${
                !year ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-background hover:bg-surface-container-high"
              }`}
            >
              Semua
            </a>
            {years.map((y) => (
              <a
                key={y}
                href={`/gallery/archive?year=${y}`}
                className={`text-label-caps uppercase px-3 py-1.5 rounded-md transition-colors ${
                  Number(year) === y ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-background hover:bg-surface-container-high"
                }`}
              >
                {y}
              </a>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Images className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">
              {year ? `Tidak ada album di tahun ${year}.` : "Belum ada album yang dipublikasikan."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map((album) => {
              const cover = album.coverImageUrl ?? coverFor(album.id);
              return (
                <a
                  key={album.id}
                  href={`/gallery/${album.id}`}
                  className="group bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
                >
                  <div className="h-52 bg-surface-container-low flex items-center justify-center overflow-hidden">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Images className="text-outline-variant" size={32} />
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-label-caps text-primary-container uppercase mb-1">{album.createdAt.getFullYear()}</p>
                    <h2 className="text-headline-md text-on-background">{album.title}</h2>
                    <p className="text-label-caps text-on-surface-variant mt-1">{countFor(album.id)} foto</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
