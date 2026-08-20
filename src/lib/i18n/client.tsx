"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { setLocale as setLocaleAction } from "@/app/actions/locale";
import { LOCALE_LABEL, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/id";
import { makeT, type T } from "./translate";

// Floor on how long the transition overlay stays up, so a change that
// resolves in 80ms doesn't just flicker. Sized for the radial-reveal
// sequence below (grow ~550ms, staggered letters, hold, shrink) - not a
// literal recreation of chongqing.ppitiongkok.com's switch (that site turned
// out to just swap text instantly, no dedicated animation - checked directly
// against the live site rather than assumed), just built to feel as
// deliberate as what was asked for.
const MIN_OVERLAY_MS = 950;

// Screen point the reveal grows from/shrinks back to - the clicked button's
// centre, not the pointer position, so keyboard activation (Enter/Space,
// clientX/Y both 0) still grows from a sensible spot.
export type Origin = { x: number; y: number };

type LocaleCtxValue = {
  locale: Locale;
  t: T;
  switching: boolean;
  targetLocale: Locale | null;
  switchLocale: (next: Locale, origin?: Origin) => void;
};

const LocaleCtx = createContext<LocaleCtxValue | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  // Built here, in the client, from plain data (`dict`) - not received as a
  // function prop from a server component. Functions can't cross the RSC
  // boundary; this project has hit that exact bug twice before (lucide icon
  // components as props, an async () => {} action prop), so the dictionary is
  // always shipped as data and turned into `t` only on this side.
  const t = useMemo(() => makeT(dict), [dict]);

  // Only `startTransition` is used, not its `isPending` flag - Next.js
  // recommends wrapping a directly-called Server Action in a transition so
  // the resulting router refresh (from revalidatePath) stays coordinated
  // with React's rendering, but `isPending` itself was observed to never
  // flip back to false for this async-Server-Action-in-startTransition
  // shape: the overlay stayed on screen 4+ seconds after the DOM had
  // already re-rendered with the new language (checked directly in the
  // browser: `lang` and visible text were correctly updated; `isPending`
  // just never resolved). So closing the overlay reacts to the `locale`
  // prop actually changing instead - see the effect below.
  const [, startTransition] = useTransition();
  const [holding, setHolding] = useState(false);
  const [targetLocale, setTargetLocale] = useState<Locale | null>(null);
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0 });
  const startedAt = useRef(0);

  const switchLocale = useCallback(
    (next: Locale, o?: Origin) => {
      if (next === locale || holding) return;
      setTargetLocale(next);
      setOrigin(o ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setHolding(true);
      startedAt.current = Date.now();
      startTransition(() => {
        setLocaleAction(next);
      });
    },
    [locale, holding, startTransition],
  );

  // Closes the overlay once `locale` (a prop, driven by the server re-render
  // after revalidatePath) actually reaches the target - proof the new
  // content is ready - held for at least MIN_OVERLAY_MS from the click.
  useEffect(() => {
    if (!holding || locale !== targetLocale) return;
    const remaining = Math.max(0, MIN_OVERLAY_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setHolding(false), remaining);
    return () => clearTimeout(timer);
  }, [holding, locale, targetLocale]);

  // Safety net, independent of the above: never let the overlay block the
  // page forever if the round trip above never lands for some reason
  // (network hiccup, the action throwing, etc).
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setHolding(false), 4000);
    return () => clearTimeout(timer);
  }, [holding]);

  const switching = holding;

  const value = useMemo(
    () => ({ locale, t, switching, targetLocale, switchLocale }),
    [locale, t, switching, targetLocale, switchLocale],
  );

  return (
    <LocaleCtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {switching && targetLocale && <LocaleRevealOverlay target={targetLocale} origin={origin} />}
      </AnimatePresence>
    </LocaleCtx.Provider>
  );
}

// Radial reveal: a circle of the brand accent colour grows from the clicked
// button until it covers the screen, the target language name stamps in
// letter-by-letter once covered, then it shrinks back to the same point -
// same idea as the Material "theme ripple" transition. Grown via a `scale`
// transform on a pre-sized circle (not an animated `clip-path` string) -
// `scale` is Motion's most reliable, GPU-accelerated primitive, and in this
// Motion version (13.1) a directly-interpolated `clipPath` string silently
// never started (`document.getAnimations()` stayed empty, confirmed in the
// browser before switching approach) - not worth chasing further when scale
// gives the identical visual result.
function LocaleRevealOverlay({ target, origin }: { target: Locale; origin: Origin }) {
  const reduceMotion = useReducedMotion();

  // Computed directly during render, not via useState+useEffect: this
  // component only ever mounts client-side (it lives inside
  // `{switching && ...}`, and `switching` starts false, so there's no SSR
  // pass to desync from) and it doesn't need to react to a resize mid-switch
  // - the whole thing is gone again inside a second either way.
  const maxRadius = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const dx = Math.max(origin.x, window.innerWidth - origin.x);
    const dy = Math.max(origin.y, window.innerHeight - origin.y);
    // +40 so the edge of the circle clears the viewport corner instead of
    // just touching it (a bare Pythagorean radius leaves a 1px sliver).
    return Math.ceil(Math.hypot(dx, dy)) + 40;
  }, [origin]);

  if (reduceMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-primary-container text-on-primary"
        role="status"
        aria-live="polite"
      >
        <p className="text-headline-lg font-bold uppercase tracking-wide">{LOCALE_LABEL[target]}</p>
      </motion.div>
    );
  }

  const size = maxRadius * 2;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden" role="status" aria-live="polite">
      <motion.div
        className="absolute rounded-full bg-primary-container"
        style={{ left: origin.x - maxRadius, top: origin.y - maxRadius, width: size, height: size }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-on-primary">
        <LetterReveal text={LOCALE_LABEL[target]} />
      </div>
    </div>
  );
}

// Manually-triggered letter stagger (opacity + rise), same visual idea as
// AnimatedLettersHeading (src/components/animated-letters-heading.tsx) but
// driven by mount instead of scroll-into-view - this overlay isn't scrolled
// to, it's stamped on top of the page, so `whileInView` would never fire.
function LetterReveal({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <motion.p
      className="text-display-hero-mobile md:text-display-hero font-bold uppercase tracking-tight text-center px-6"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.025, delayChildren: 0.3 } } }}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap mr-[0.2em]" aria-hidden="true">
          {word.split("").map((letter, li) => (
            <motion.span
              key={li}
              variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.p>
  );
}

export function useT(): T {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useT() must be used within <LocaleProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale() must be used within <LocaleProvider>");
  return ctx.locale;
}

// Exposes the animated switch used by both the nav quick-toggle and the
// /profile language picker, so the reveal overlay only has to be implemented
// once. Callers should pass `origin` from the clicked element's own
// bounding-rect centre (not pointer position - see the Origin type above).
export function useLocaleSwitch() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocaleSwitch() must be used within <LocaleProvider>");
  return { switching: ctx.switching, targetLocale: ctx.targetLocale, switchLocale: ctx.switchLocale };
}
