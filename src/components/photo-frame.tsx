import Image from "next/image";

/**
 * A photograph in an arch-topped double gold mat (.photo-frame, globals.css),
 * with a caption. Server component; `next/image` serves a resized, lazy-loaded
 * copy from the same origin (no external image host, important behind the Great
 * Firewall). `sizes` matches the frame's 980px max width.
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
      <div className="mat">
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          sizes="(min-width: 1024px) 940px, calc(100vw - 2.5rem)"
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption className="text-center mt-5">
        <strong className="block text-label-caps uppercase text-primary-container">{caption}</strong>
        {note && <span className="block text-body-sm text-on-surface-variant mt-1">{note}</span>}
      </figcaption>
    </figure>
  );
}
