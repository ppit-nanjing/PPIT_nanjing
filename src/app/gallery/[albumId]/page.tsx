import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { ArrowLeft } from "lucide-react";

export default async function GalleryAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();
  const photos = await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, albumId));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <a
          href="/gallery"
          className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Kembali ke Galeri
        </a>

        <AnimatedHeroHeading
          words={album.title.split(" ")}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-2 leading-tight"
        />
        <Reveal>
          <p className="text-body-md text-on-surface-variant mb-10">
            {photos.length} foto
            {photos.length > 1 && " • klik untuk memperbesar"}
          </p>
        </Reveal>

        {photos.length === 0 ? (
          <Reveal>
            <p className="text-body-md text-on-surface-variant">Belum ada foto di album ini.</p>
          </Reveal>
        ) : (
          <GalleryLightbox
            photos={photos.map((p) => ({
              id: p.id,
              imageUrl: p.imageUrl,
              caption: p.caption ?? null,
            }))}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
