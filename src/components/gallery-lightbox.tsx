"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Photo = { id: string; imageUrl: string; caption: string | null };

/**
 * Interactive album gallery: a responsive thumbnail grid that opens a
 * full-screen lightbox on click. The lightbox supports prev/next
 * (buttons + arrow keys), Escape to close, an animated crossfade between
 * photos, and locks body scroll while open. Honors prefers-reduced-motion
 * via Motion's built-in support.
 */
export function GalleryLightbox({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null && index >= 0;

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            aria-label={p.caption ?? "Buka foto"}
          >
            <Image
              src={p.imageUrl}
              alt={p.caption ?? ""}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              {p.caption && (
                <span className="text-white text-label-caps line-clamp-2">{p.caption}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open && index !== null && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Penampil foto"
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X size={22} />
            </button>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.img
                key={photos[index].id}
                src={photos[index].imageUrl}
                alt={photos[index].caption ?? ""}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
              />
            </AnimatePresence>

            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Foto berikutnya"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {photos[index].caption && (
              <p className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white text-label-caps text-center px-4 max-w-xl">
                {photos[index].caption}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
