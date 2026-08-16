import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Images } from "lucide-react";

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
  return (
    <Reveal delay={Math.min(index * 0.06, 0.4)}>
      <Link
        href={`/gallery/${album.id}`}
        className="group block h-full bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_14px_40px_rgba(39,23,22,0.10)] hover:-translate-y-1 transition-all duration-300"
      >
        <div className="relative h-52 bg-surface-container-low flex items-center justify-center overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={album.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <Images className="text-outline-variant" size={36} />
          )}
          {year && (
            <span className="absolute top-3 left-3 text-label-caps text-on-primary bg-primary-container/90 px-2.5 py-1 rounded-md">
              {year}
            </span>
          )}
        </div>
        <div className="p-5">
          <h2 className="text-headline-md text-on-background group-hover:text-primary-container transition-colors">
            {album.title}
          </h2>
          <p className="text-label-caps text-on-surface-variant mt-1">{count} foto</p>
        </div>
      </Link>
    </Reveal>
  );
}
