"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  MapPin,
  ExternalLink,
  Landmark,
  Church,
  ShoppingBag,
  UtensilsCrossed,
  Trees,
  BookOpen,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";

// Icons + accents live here, not in the server page: lucide components are
// functions and functions can't cross the RSC boundary (this project has hit
// that exact bug before - see the note in src/lib/i18n/client.tsx). The page
// sends plain data only; the category key is re-mapped to an icon on this side.
// Keep in sync with placeCategoryEnum in schema.ts and /console/katalog.
const CATEGORY: Record<string, { icon: LucideIcon; accent: string }> = {
  tourism: { icon: Landmark, accent: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  culture: { icon: BookOpen, accent: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  nature: { icon: Trees, accent: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  food: { icon: UtensilsCrossed, accent: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
  shopping: { icon: ShoppingBag, accent: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400" },
  spiritual: { icon: Church, accent: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  practical: { icon: Store, accent: "bg-teal-500/12 text-teal-600 dark:text-teal-400" },
};

// One row per place, already localised and flattened by the server component.
export type PlaceCard = {
  id: string;
  category: string;
  categoryLabel: string;
  district: string | null;
  name: string;
  nameZh: string | null;
  description: string | null;
  address: string | null;
  addressZh: string | null;
  imageUrl: string | null;
  mapUrl: string | null;
};

const DENSITIES = ["s", "l"] as const;
type Density = (typeof DENSITIES)[number];

const STORAGE_KEY = "places:density";
// L matches what the page shipped with before the selector existed, so a
// first-time visitor sees no change until they opt into the denser view.
const DEFAULT_DENSITY: Density = "l";

function isDensity(v: string | null): v is Density {
  return v === "s" || v === "l";
}

// --- density store -------------------------------------------------------
// A tiny external store over localStorage. It exists so the component can use
// useSyncExternalStore (see PlacesGrid) instead of syncing the stored value
// into state from an effect.

const listeners = new Set<() => void>();

// getSnapshot must return a referentially stable value or React re-renders in
// a loop, so the parsed preference is cached rather than re-read from
// localStorage on every call. `undefined` means "not read yet".
let cachedDensity: Density | undefined;

function subscribeDensity(listener: () => void) {
  listeners.add(listener);
  // `storage` fires when another tab changes the preference, keeping two open
  // copies of /places in agreement.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cachedDensity = isDensity(e.newValue) ? e.newValue : DEFAULT_DENSITY;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getDensitySnapshot(): Density {
  if (cachedDensity !== undefined) return cachedDensity;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cachedDensity = isDensity(stored) ? stored : DEFAULT_DENSITY;
  } catch {
    // Private mode / site data blocked: fall back, and cache it so the throw
    // isn't repeated on every render.
    cachedDensity = DEFAULT_DENSITY;
  }
  return cachedDensity;
}

// Server render (and the hydration pass) always uses the default, so the
// markup React produces on the client first matches the HTML from the server.
function getServerDensitySnapshot(): Density {
  return DEFAULT_DENSITY;
}

// --- viewport ------------------------------------------------------------
// The density choice is deliberately mobile-only, so the component has to know
// whether it is actually on a narrow viewport - a CSS-only `sm:hidden` can hide
// the selector but cannot stop the *content* rules (which fields a card shows)
// from applying, which is exactly how desktop lost its descriptions when the
// stored preference happened to be "s".
const MOBILE_QUERY = "(max-width: 639px)"; // Tailwind's `sm` breakpoint is 640px.

function subscribeMobile(listener: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

function getMobileSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// Server can't know the viewport; false keeps SSR output identical to the
// desktop/full layout, which is also the safe fallback.
function getServerMobileSnapshot(): boolean {
  return false;
}

export function PlacesGrid({ places }: { places: PlaceCard[] }) {
  const t = useT();
  const reduce = useReducedMotion();

  // localStorage is an external store, so it's read through
  // useSyncExternalStore rather than copied into state inside an effect: the
  // server snapshot is always DEFAULT_DENSITY (matching the SSR'd HTML) while
  // the client snapshot is the stored value, so hydration lines up and React
  // swaps to the real preference in the same commit - no cascading render.
  const density = useSyncExternalStore(subscribeDensity, getDensitySnapshot, getServerDensitySnapshot);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerMobileSnapshot);

  // `compact` - not `density === "s"` - gates every layout decision below, so
  // the preference can only ever change the mobile rendering. Desktop always
  // gets the full card.
  const compact = isMobile && density === "s";

  const [openId, setOpenId] = useState<string | null>(null);
  const open = places.find((p) => p.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);

  const choose = useCallback((next: Density) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; the view below still updates, because
      // the cache is the source getDensitySnapshot reads from.
    }
    cachedDensity = next;
    for (const listener of listeners) listener();
  }, []);

  const labels: Record<Density, { short: string; full: string }> = {
    s: { short: t("places.densityS"), full: t("places.densitySFull") },
    l: { short: t("places.densityL"), full: t("places.densityLFull") },
  };

  return (
    <>
      {/* Mobile only. The grid below keys off `compact`, which already
          includes the viewport check, so hiding this is purely cosmetic. */}
      <div className="flex items-center justify-end gap-2 mb-4 sm:hidden">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {t("places.densityLabel")}
        </span>
        <div
          role="group"
          aria-label={t("places.densityAria")}
          className="inline-flex rounded-lg border border-outline-variant overflow-hidden"
        >
          {DENSITIES.map((d) => {
            const active = density === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => choose(d)}
                aria-pressed={active}
                // The visible glyph is a bare "S"/"L"; the accessible name
                // spells the choice out so it isn't just a letter in a screen
                // reader.
                aria-label={labels[d].full}
                className={`px-4 py-1.5 text-label-caps uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container ${
                  active
                    ? "bg-primary-container text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {labels[d].short}
              </button>
            );
          })}
        </div>
      </div>

      {/* No `items-start` here: grid items default to `stretch`, so every card
          in a row shares the tallest card's height - the aligned look the
          deployed site has. The cards themselves are `flex-col` with a
          flex-1 body, so the extra height goes into the card, not a gap. */}
      <ul
        className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${
          compact ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {places.map((p) => {
          const cat = CATEGORY[p.category];
          const Icon = cat?.icon ?? MapPin;

          // Compact card: image + name only, and the whole card is a button
          // that opens the detail dialog. Everything the card drops (category,
          // district, description, address, map link) lives in that dialog, so
          // nothing becomes unreachable at this size.
          if (compact) {
            return (
              // `flex` on the li (plus h-full on the button) passes the grid's
              // stretched row height through the wrapper to the button, so
              // every card in a row ends up the same height even though the
              // names wrap to different line counts.
              <li key={p.id} className="flex">
                <button
                  type="button"
                  onClick={() => setOpenId(p.id)}
                  aria-haspopup="dialog"
                  className="group w-full h-full text-left flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden transition-shadow hover:shadow-md motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <CardImage place={p} Icon={Icon} accent={cat?.accent} compact />
                  <div className="flex flex-col gap-0.5 p-3 flex-1">
                    <h2 className="text-body-sm leading-snug text-on-background">{p.name}</h2>
                    {p.nameZh && (
                      <span className="text-body-sm leading-snug text-on-surface-variant">{p.nameZh}</span>
                    )}
                  </div>
                </button>
              </li>
            );
          }

          return (
            <li
              key={p.id}
              className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden transition-shadow hover:shadow-md motion-reduce:transition-none"
            >
              <CardImage place={p} Icon={Icon} accent={cat?.accent} />
              <div className="flex flex-col gap-2 p-5 flex-1">
                <span className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant">
                  <Icon size={13} aria-hidden className="shrink-0" />
                  <span>
                    {p.categoryLabel}
                    {p.district ? ` · ${p.district}` : ""}
                  </span>
                </span>
                <h2 className="text-headline-sm text-on-background">
                  {p.name}
                  {p.nameZh && <span className="text-body-md text-on-surface-variant"> {p.nameZh}</span>}
                </h2>
                {p.description && (
                  <p className="text-body-md text-on-surface-variant flex-1">{p.description}</p>
                )}
                {p.address && (
                  <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5">
                    <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                    <span>
                      {p.address}
                      {p.addressZh && <span className="block">{p.addressZh}</span>}
                    </span>
                  </p>
                )}
                {p.mapUrl && (
                  <a
                    href={p.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                  >
                    {t("places.openMap")} <ExternalLink size={13} aria-hidden />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <PlaceDetailDialog place={open} onClose={close} reduce={!!reduce} />
    </>
  );
}

// Shared between the compact and full cards so the no-photo fallback stays in
// one place.
function CardImage({
  place,
  Icon,
  accent,
  compact = false,
}: {
  place: PlaceCard;
  Icon: LucideIcon;
  accent?: string;
  compact?: boolean;
}) {
  if (place.imageUrl) {
    return (
      <div className="relative w-full aspect-[4/3] bg-surface-container">
        <Image
          src={place.imageUrl}
          alt=""
          fill
          // Widths track the density ladder so a 2-up phone grid doesn't
          // download a full-width image for a ~190px slot.
          sizes="(max-width: 639px) 50vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
    );
  }
  // No photo yet: a coloured, category-themed header keeps the card visually
  // complete instead of leaving a blank gap.
  return (
    <div
      className={`relative w-full aspect-[4/3] flex items-center justify-center ${accent ?? "bg-surface-container text-on-surface-variant"}`}
    >
      <Icon size={compact ? 30 : 44} aria-hidden strokeWidth={1.5} />
    </div>
  );
}

// One body line of the detail popup: rises and fades in. The parent's
// `staggerChildren` is what sequences them; under reduced motion the parent
// zeroes both stagger and delay, and Motion's own reduced-motion handling
// drops the `y` transform, so this resolves to a plain fade.
const LINE_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// Detail popup for the compact grid. Modal mechanics (focus trap, Escape,
// scroll lock, focus restore) follow GalleryLightbox - the project's existing
// public-facing dialog - rather than inventing a second pattern.
function PlaceDetailDialog({
  place,
  onClose,
  reduce,
}: {
  place: PlaceCard | null;
  onClose: () => void;
  reduce: boolean;
}) {
  const t = useT();
  const open = place !== null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
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
    };

    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  const cat = place ? CATEGORY[place.category] : undefined;
  const Icon = cat?.icon ?? MapPin;

  return (
    <AnimatePresence>
      {open && place && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("places.detailAria")}
            onClick={(e) => e.stopPropagation()}
            // Centred at every size, and springs open from slightly small and
            // low - the same spring family as the filter-tab pill
            // (filter-tabs.tsx), so the motion reads as part of this site
            // rather than a generic fade. Exit is a short tween, not a spring:
            // a spring's overshoot on the way out reads as a bounce-away.
            initial={{ opacity: 0, scale: reduce ? 1 : 0.92, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 8 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8,
                    opacity: { duration: 0.18 },
                  }
            }
            className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl"
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={20} />
            </button>

            <CardImage place={place} Icon={Icon} accent={cat?.accent} />

            {/* The body settles in just behind the box: each line rises a few
                pixels in turn, which makes the popup feel like it's opening
                rather than simply appearing. Reduced-motion collapses the
                whole thing to a plain, instant render (STAGGER_* are zeroed). */}
            <motion.div
              className="flex flex-col gap-3 p-5"
              initial="hidden"
              animate="shown"
              variants={{
                shown: {
                  transition: {
                    staggerChildren: reduce ? 0 : 0.045,
                    delayChildren: reduce ? 0 : 0.08,
                  },
                },
              }}
            >
              <motion.span
                variants={LINE_VARIANTS}
                className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant"
              >
                <Icon size={13} aria-hidden className="shrink-0" />
                <span>
                  {place.categoryLabel}
                  {place.district ? ` · ${place.district}` : ""}
                </span>
              </motion.span>

              <motion.h2 variants={LINE_VARIANTS} className="text-headline-sm text-on-background">
                {place.name}
                {place.nameZh && (
                  <span className="text-body-md text-on-surface-variant"> {place.nameZh}</span>
                )}
              </motion.h2>

              {place.description && (
                <motion.p variants={LINE_VARIANTS} className="text-body-md text-on-surface-variant">
                  {place.description}
                </motion.p>
              )}

              {place.address && (
                <motion.p
                  variants={LINE_VARIANTS}
                  className="text-body-sm text-on-surface-variant flex items-start gap-1.5"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    {place.address}
                    {place.addressZh && <span className="block">{place.addressZh}</span>}
                  </span>
                </motion.p>
              )}

              {place.mapUrl && (
                <motion.a
                  variants={LINE_VARIANTS}
                  href={place.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                >
                  {t("places.openMap")} <ExternalLink size={13} aria-hidden />
                </motion.a>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
