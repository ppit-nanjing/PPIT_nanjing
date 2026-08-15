import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default async function GalleryAlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();
  const photos = await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, albumId));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">{album.title}</h1>
        <p className="text-body-md text-on-surface-variant mb-10">{photos.length} foto</p>

        {photos.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada foto di album ini.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((p) => (
              <figure key={p.id} className="rounded-lg overflow-hidden bg-surface-container-low">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.caption ?? album.title} className="w-full aspect-square object-cover" />
                {p.caption && <figcaption className="text-label-caps text-on-surface-variant p-2">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
