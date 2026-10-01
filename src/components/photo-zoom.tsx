"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { useT } from "@/lib/i18n/client";

/**
 * The photo inside a PhotoFrame mat: a button that opens the full picture in a
 * native modal <dialog>. The dialog gives Escape-to-close, a focus trap, inert
 * background and focus return for free; a click anywhere outside the picture
 * closes it too. The large copy is only mounted while open, so the page does not
 * download it up front. The enlarged <img> sits outside `.mat`, so the frame's
 * arch-radius image rule does not touch it.
 */
export function PhotoZoom({
  src,
  width,
  height,
  alt,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const show = () => {
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <div className="mat">
        <button
          type="button"
          onClick={show}
          aria-haspopup="dialog"
          aria-label={`${t("home.family.zoom")}: ${alt}`}
          className="group relative block w-full cursor-zoom-in rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src={src}
            width={width}
            height={height}
            alt={alt}
            sizes="(min-width: 1024px) 940px, calc(100vw - 2.5rem)"
            loading="lazy"
            decoding="async"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-md bg-band/80 text-on-band transition-colors group-hover:bg-band motion-reduce:transition-none"
          >
            <ZoomIn size={18} />
          </span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={alt}
        onClose={() => setOpen(false)}
        onClick={close}
        className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-black/95 p-0 backdrop:bg-transparent"
      >
        <button
          type="button"
          onClick={close}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none sm:right-6 sm:top-6"
        >
          <X size={22} aria-hidden="true" />
        </button>
        <div className="flex h-full w-full items-center justify-center p-3 sm:p-10">
          {open && (
            <Image
              src={src}
              width={width}
              height={height}
              alt={alt}
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
              className="h-auto max-h-[90dvh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
          )}
        </div>
      </dialog>
    </>
  );
}
