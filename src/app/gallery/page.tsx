import { desc } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Images } from "lucide-react";

export default async function GalleryPage() {
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));
  const allPhotos = await db.select().from(galleryPhotos);
  const coverFor = (albumId: string) => allPhotos.find((p) => p.albumId === albumId)?.imageUrl;
  const countFor = (albumId: string) => allPhotos.filter((p) => p.albumId === albumId).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">Galeri</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Momen-momen kegiatan PPIT Nanjing, terdokumentasi per album.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {albums.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Images className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">Belum ada album yang dipublikasikan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {albums.map((album) => {
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
