import { PhotoZoom } from "@/components/photo-zoom";

/**
 * A photograph in an arch-topped double gold mat (.photo-frame, globals.css),
 * with a caption. The picture itself is a PhotoZoom: tapping it opens the full
 * image. `next/image` serves a resized, lazy-loaded copy from the same origin (no
 * external image host, important behind the Great Firewall). `sizes` matches the
 * frame's 980px max width.
 */
export function PhotoFrame({
  src,
  width,
  height,
  alt,
  caption,
  note,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  note?: string;
}) {
  return (
    <figure className="photo-frame max-w-[980px] mx-auto">
      <span className="crest" aria-hidden="true" />
      <PhotoZoom src={src} width={width} height={height} alt={alt} />
      <figcaption className="text-center mt-5">
        <strong className="block text-label-caps uppercase text-primary-container">{caption}</strong>
        {note && <span className="block text-body-sm text-on-surface-variant mt-1">{note}</span>}
      </figcaption>
    </figure>
  );
}
