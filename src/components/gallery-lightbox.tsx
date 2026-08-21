"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type Photo = { id: string; imageUrl: string; caption: string | null };

export function GalleryLightbox({ photos }: { photos: Photo[] }) {
  const t = useT();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState<number | null>(null);
  const open = index !== null && index >= 0;

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

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
    triggerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIndex(photos.length - 1);
      } else if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus?.();
    };
  }, [open, close, prev, next, setIndex, photos.length]);

  return (
    <>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" aria-label={t("lightbox.albumAria")}>
        {photos.map((p, i) => (
          <li key={p.id} className="list-none">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full aspect-square rounded-lg overflow-hidden bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={p.caption ? t("lightbox.openPhotoNamed", { caption: p.caption }) : t("lightbox.openPhoto")}
            >
              <Image
                src={p.imageUrl}
                alt={p.caption ?? t("lightbox.photoAlt", { index: i + 1 })}
                fill
                loading="lazy"
                decoding="async"
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 motion-reduce:transition-none flex items-end p-3">
                {p.caption && (
                  <span className="text-white text-label-caps line-clamp-2">{p.caption}</span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open && index !== null && (
          <motion.div
            ref={dialogRef}
            className="fixed inset-0 z-[70] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={t("lightbox.viewerAria", { index: index + 1, total: photos.length })}
          >
            <p className="sr-only" aria-live="polite">
              {t("lightbox.photoOfTotal", { index: index + 1, total: photos.length })}
              {photos[index].caption ? `: ${photos[index].caption}` : ""}
            </p>

            <span
              aria-hidden="true"
              className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/80 text-label-caps"
            >
              {index + 1} / {photos.length}
            </span>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={t("common.close")}
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
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t("lightbox.prev")}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.img
                key={photos[index].id}
                src={photos[index].imageUrl}
                alt={photos[index].caption ?? t("lightbox.photoAlt", { index: index + 1 })}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
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
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t("lightbox.next")}
              >
                <ChevronRight size={24} />
              </button>
            )}

            {photos[index].caption && (
              <p
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white text-label-caps text-center px-4 max-w-xl pointer-events-none"
              >
                {photos[index].caption}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
