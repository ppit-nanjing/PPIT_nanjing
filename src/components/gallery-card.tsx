import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Images, Expand } from "lucide-react";
import Image from "next/image";

export type GalleryCardAlbum = {
  id: string;
  title: string;
};

/**
 * Album card for the /gallery and /gallery/archive listings. Staggered
 * scroll-in via <Reveal>, with a hover lift, cover zoom, and optional
 * year badge. Shared across both gallery index pages.
 */
export function GalleryCard({
  album,
  cover,
  count,
  year,
  index = 0,
}: {
  album: GalleryCardAlbum;
  cover: string | null;
  count: number;
  year?: number;
  index?: number;
}) {
  const photoLabel = count === 1 ? "1 foto" : `${count} foto`;

  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/gallery/${album.id}`}
        aria-label={`Lihat album ${album.title}`}
        className="group block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 focus-visible:outline-none focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[0_14px_40px_rgba(39,23,22,0.10)] transition-all duration-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
      >
        <div className="relative h-52 bg-surface-container-low flex items-center justify-center overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={`Sampul album ${album.title}`}
              fill
              loading="lazy"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
            />
          ) : (
            <Images className="text-outline-variant" size={36} />
          )}
          {year && (
            <span className="absolute top-3 left-3 z-10 text-label-caps text-on-primary bg-primary-container/90 px-2.5 py-1 rounded-md">
              {year}
            </span>
          )}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 motion-reduce:transition-none">
            <Expand className="text-white drop-shadow" size={28} />
          </div>
        </div>
        <div className="p-5">
          <h2 className="text-headline-md text-on-background group-hover:text-primary-container group-focus-visible:text-primary-container transition-colors">
            {album.title}
          </h2>
          <p className="text-label-caps text-on-surface-variant mt-1">{photoLabel}</p>
        </div>
      </Link>
    </Reveal>
  );
}
