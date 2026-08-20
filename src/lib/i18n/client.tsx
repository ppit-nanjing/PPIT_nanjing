"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { setLocale as setLocaleAction } from "@/app/actions/locale";
import { LOCALE_LABEL, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/id";
import { makeT, type T } from "./translate";

// Floor on how long the transition overlay stays up, so a change that
// resolves in 80ms doesn't just flicker - matches the reference site
// (chongqing.ppitiongkok.com) this was asked to feel like, whose language
// switch always holds its loading screen for a beat before revealing the new
// text, even though the swap itself is instant under the hood.
const MIN_OVERLAY_MS = 650;

type LocaleCtxValue = {
  locale: Locale;
  t: T;
  switching: boolean;
  targetLocale: Locale | null;
  switchLocale: (next: Locale) => void;
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

  const [isPending, startTransition] = useTransition();
  const [holding, setHolding] = useState(false);
  const [targetLocale, setTargetLocale] = useState<Locale | null>(null);
  const startedAt = useRef(0);

  const switchLocale = useCallback(
    (next: Locale) => {
      if (next === locale || isPending || holding) return;
      setTargetLocale(next);
      setHolding(true);
      startedAt.current = Date.now();
      startTransition(async () => {
        await setLocaleAction(next);
      });
    },
    [locale, isPending, holding, startTransition],
  );

  // Keeps the overlay up for at least MIN_OVERLAY_MS even once the action +
  // revalidation have already resolved (isPending goes false).
  useEffect(() => {
    if (isPending || !holding) return;
    const remaining = Math.max(0, MIN_OVERLAY_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setHolding(false), remaining);
    return () => clearTimeout(timer);
  }, [isPending, holding]);

  const switching = holding || isPending;

  const value = useMemo(
    () => ({ locale, t, switching, targetLocale, switchLocale }),
    [locale, t, switching, targetLocale, switchLocale],
  );

  return (
    <LocaleCtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {switching && targetLocale && <LocaleTransitionOverlay target={targetLocale} />}
      </AnimatePresence>
    </LocaleCtx.Provider>
  );
}

function LocaleTransitionOverlay({ target }: { target: Locale }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        {reduceMotion ? (
          <span className="h-10 w-10 rounded-full border-2 border-primary-container" aria-hidden />
        ) : (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            className="h-10 w-10 rounded-full border-2 border-outline-variant border-t-primary-container"
            aria-hidden
          />
        )}
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {LOCALE_LABEL[target]}
        </p>
      </motion.div>
    </motion.div>
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
// /profile language picker, so the transition overlay only has to be
// implemented once.
export function useLocaleSwitch() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocaleSwitch() must be used within <LocaleProvider>");
  return { switching: ctx.switching, targetLocale: ctx.targetLocale, switchLocale: ctx.switchLocale };
}
