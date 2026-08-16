import { desc } from "drizzle-orm";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { AnimatedRevealText } from "@/components/animated-reveal-text";
import { Reveal } from "@/components/reveal";
import { GalleryCard } from "@/components/gallery-card";
import { Images, Archive } from "lucide-react";
import Link from "next/link";

export default async function GalleryPage() {
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));
  const allPhotos = await db.select().from(galleryPhotos);
  const coverFor = (albumId: string) => allPhotos.find((p) => p.albumId === albumId)?.imageUrl;
  const countFor = (albumId: string) => allPhotos.filter((p) => p.albumId === albumId).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <AnimatedHeroHeading
            words={["Galeri"]}
            className="text-display-hero-mobile md:text-display-hero text-on-background mb-4"
          />
          <AnimatedRevealText text="Momen-momen kegiatan PPIT Nanjing, terdokumentasi per album." />
        </div>
        <Link
          href="/gallery/archive"
          className="flex items-center gap-2 text-label-caps text-primary-container hover:text-primary transition-colors shrink-0"
        >
          <Archive size={16} /> Arsip per Tahun
        </Link>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {albums.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center text-center py-24">
              <Images className="text-outline-variant mb-4" size={40} aria-hidden="true" />
              <h2 className="text-headline-md text-on-background mb-2">Belum ada album</h2>
              <p className="text-body-md text-on-surface-variant mb-6">Belum ada album yang dipublikasikan saat ini.</p>
              <Link
                href="/gallery/archive"
                className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Archive size={16} /> Lihat Arsip
              </Link>
            </div>
          </Reveal>
        ) : (
          <>
            <p className="sr-only">{albums.length} album tersedia</p>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-label="Daftar album galeri">
              {albums.map((album, i) => (
                <li key={album.id} className="list-none">
                  <GalleryCard
                    index={i}
                    album={{ id: album.id, title: album.title }}
                    cover={album.coverImageUrl ?? coverFor(album.id) ?? null}
                    count={countFor(album.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
