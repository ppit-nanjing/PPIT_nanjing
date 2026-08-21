import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { Reveal } from "@/components/reveal";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { ArrowLeft, Images } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function GalleryAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const { t } = await getT();
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();
  const photos = await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, albumId));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] py-16">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-1 flex-wrap">
            <li>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                 <ArrowLeft size={16} /> {t("gallery.back")}
               </Link>
             </li>
            <li className="mx-1 text-on-surface-variant" aria-hidden="true">
              /
            </li>
            <li>
              <Link
                href="/gallery/archive"
                className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                {t("gallery.viewArchive")}
              </Link>
            </li>
          </ol>
        </nav>

        <AnimatedHeroHeading
          words={album.title.split(" ")}
          className="text-display-hero-mobile md:text-display-hero text-on-background mb-2 leading-tight"
        />
        <Reveal>
          <p className="text-body-md text-on-surface-variant mb-10">
            {t("gallery.photoCount", {
              n: photos.length,
              extra: photos.length > 1 ? t("gallery.photoZoomHint") : "",
            })}
          </p>
        </Reveal>

        {photos.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center text-center py-20">
              <Images className="text-outline-variant mb-4" size={40} aria-hidden="true" />
              <h2 className="text-headline-md text-on-background mb-2">{t("gallery.emptyTitle2")}</h2>
              <p className="text-body-md text-on-surface-variant mb-6">{t("gallery.emptyDesc2")}</p>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ArrowLeft size={16} /> {t("gallery.back")}
              </Link>
            </div>
          </Reveal>
        ) : (
          <section aria-label={t("gallery.albumPhotos", { title: album.title })}>
            <GalleryLightbox
              photos={photos.map((p) => ({
                id: p.id,
                imageUrl: p.imageUrl,
                caption: p.caption ?? null,
              }))}
            />
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
