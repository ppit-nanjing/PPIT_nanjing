"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { X, ZoomIn } from "lucide-react";
import { useT } from "@/lib/i18n/client";

/**
 * A thumbnail (children) wrapped in a button that opens the full picture in a
 * native modal <dialog>. The dialog gives Escape-to-close, a focus trap, inert
 * background and focus return for free; a click anywhere outside the picture
 * closes it too. The large copy is only mounted while open, so the page does not
 * download it up front. Used by PhotoFrame (static import) and inventory cards
 * (Blob URL).
 */
export function PhotoZoom({
  image,
  alt,
  className = "",
  children,
}: {
  image: StaticImageData | string;
  alt: string;
  className?: string;
  children: ReactNode;
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
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-label={`${t("home.family.zoom")}: ${alt}`}
        className={`group relative block w-full cursor-zoom-in rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
      >
        {children}
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-md bg-band/80 text-on-band transition-colors group-hover:bg-band motion-reduce:transition-none"
        >
          <ZoomIn size={18} />
        </span>
      </button>

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
              src={image}
              alt={alt}
              // A URL has no intrinsic size for next/image; the CSS below lets the real size win once loaded.
              {...(typeof image === "string" && { width: 1000, height: 1000 })}
              loading="eager"
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
