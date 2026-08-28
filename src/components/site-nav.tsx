"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X, Search, User, ChevronDown, Languages } from "lucide-react";
import Image from "next/image";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { NAV_LINKS, DISCOVER_LINKS } from "@/lib/nav-links";
import { useT, useLocale, useLocaleSwitch, type Origin } from "@/lib/i18n/client";
import { LOCALE_LABEL, LOCALE_SHORT, otherLocale, type Locale } from "@/lib/i18n/config";
import type { T } from "@/lib/i18n/translate";
import Link from "next/link";

// Scroll state: a gentle, intentional pill. We use a boolean threshold
// (not a continuous, scroll-position-driven interpolation) so the navbar
// snaps to a comfortable floating pill once you start scrolling, instead of
// the width "chasing" every pixel of scroll - which read as jittery/weird.
// The pill never shrinks below a width that would crush the links + search
// pill, so content stays intact on smaller desktops.
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

export function SiteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { data: session } = useSession();
  const [showHint, setShowHint] = useState(false);
  const t = useT();
  const locale = useLocale();
  const { switchLocale } = useLocaleSwitch();

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem("ppit-cmdk-hint-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  // First-visit nudge advertising the Ctrl/⌘+K shortcut. Shown once, then
  // remembered via localStorage; also dismissed as soon as the palette opens.
  useEffect(() => {
    try {
      if (!localStorage.getItem("ppit-cmdk-hint-dismissed")) {
        // First-visit hint, shown once after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowHint(true);
        const t = setTimeout(() => setShowHint(false), 7000);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // Dismiss the shortcut hint as soon as the palette opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (paletteOpen) dismissHint();
  }, [paletteOpen]);
  // The width-shrink + inline links only make sense on real desktops. On
  // phones/tablets the burger menu is used, and shrinking the pill would just
  // crush the brand + icons, so we keep it near full-width there.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Close the mobile menu whenever navigation occurs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the command palette or the mobile/tablet menu is
  // open. Without this, scrolling behind the fixed palette re-renders the
  // blurred navbar every frame (the scroll-jank you noticed), and the page
  // itself shouldn't move under a modal anyway.
  useEffect(() => {
    if (!paletteOpen && !menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paletteOpen, menuOpen]);

  // Compact floating pill once scrolled (desktop only). Mobile/tablet stays
  // full-width since the burger menu is used there. The width is capped at a
  // comfortable fixed value so the links + search pill never get crushed.
  // Everything (account menu, search) collapses to icon-only when shrunk.
  const compact = isDesktop && scrolled;
  // Animate max-width (not width): transitioning a plain `100%` to a
  // `min(100%, 1000px)` value isn't interpolable, so the pill would snap
  // straight to the end instead of easing. max-width px -> px interpolates
  // smoothly while width stays 100%.
  const maxWidth = compact ? "1200px" : "1320px";

  // Glass + shadow appear on scroll only; opaque & flat at rest.
  const bgAlpha = scrolled ? 0.82 : 1;
  const blurPx = scrolled ? 12 : 0;
  const shadowAlpha = scrolled ? 0.14 : 0;

  return (
    <>
      <header className="w-full sticky top-0 z-50 flex justify-center p-2.5 xl:px-1.5">
        <nav
          className="rounded-full"
          style={{
            width: "100%",
            maxWidth,
            // Follows the active palette instead of the old hardcoded cream,
            // so the nav is not stuck light in dark mode.
            backgroundColor: `color-mix(in srgb, var(--color-background) ${Math.round(bgAlpha * 100)}%, transparent)`,
            backdropFilter: `blur(${blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurPx}px) saturate(140%)`,
            boxShadow: `0 10px 30px rgba(39,23,22,${shadowAlpha})`,
            transition:
              "max-width 350ms cubic-bezier(0.22, 1, 0.36, 1), background-color 350ms ease, backdrop-filter 350ms ease, -webkit-backdrop-filter 350ms ease, box-shadow 350ms ease",
          }}
        >
          <div
            className="mx-auto flex justify-between items-center gap-2 sm:gap-4 h-12 md:h-14 px-4 sm:px-6"
            style={{ maxWidth }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-headline-sm sm:text-headline-md font-bold text-primary uppercase tracking-tight shrink-0 whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className="brand-logo w-6 h-6"
                style={{ backgroundColor: "currentColor" }}
              />
              <span>PPIT Nanjing</span>
            </Link>

            {/* Inline links: desktop (lg) and up only - narrower viewports use
                the burger menu below. */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-7 text-body-md shrink-0">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative overflow-hidden h-5 shrink-0 whitespace-nowrap group ${
                      active ? "text-primary" : "text-secondary"
                    }`}
                  >
                    {/* leading-5: text-body-md's line-height (26.4px) is taller than
                        this h-5 (20px) box, so without pinning line-height to match,
                        the glyph sits at "top of an oversized line box, clipped" -
                        a different vertical position than Jelajahi's span, which is
                        what made the row read as unaligned. Also keeps the hover
                        roll swap trading exactly one 20px slot, matching translate-y-5. */}
                    <span className="block leading-5 transition-transform duration-200 ease-out group-hover:-translate-y-5 font-medium">
                      {t(link.labelKey)}
                    </span>
                    <span className="block leading-5 absolute inset-0 translate-y-5 transition-transform duration-200 ease-out group-hover:translate-y-0 text-primary-container font-medium">
                      {t(link.labelKey)}
                    </span>
                  </a>
                );
              })}
              <DiscoverMenu pathname={pathname} />
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className="relative">
                {/* Desktop, expanded: labeled search pill that advertises the
                    shortcut. Collapses to icon-only when the navbar shrinks. */}
                <button
                  aria-label={t("nav.searchAria")}
                  type="button"
                  onClick={() => {
                    setPaletteOpen(true);
                    dismissHint();
                  }}
                  className={`${compact ? "hidden" : "hidden lg:flex"} items-center gap-2 bg-surface-container-low text-on-surface-variant rounded-full pl-3 pr-2 py-1.5 text-body-md hover:bg-surface-container transition-colors`}
                >
                  <Search size={16} />
                  <span>{t("nav.searchPlaceholder")}</span>
                  <kbd className="text-label-caps border border-outline-variant rounded px-1.5 py-0.5">⌘K</kbd>
                </button>
                {/* Icon-only trigger: mobile/tablet, and also desktop once the
                    navbar has shrunk (no keyboard shortcut hint needed then). */}
                <button
                  aria-label={t("nav.search")}
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className={`${compact ? "lg:flex" : "lg:hidden"} text-on-background p-1 shrink-0`}
                >
                  <Search size={20} />
                </button>

                {/* First-visit hint pointing at the shortcut. */}
                {showHint && isDesktop && (
                  <div className="absolute right-0 top-full mt-2 z-[55] w-60 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-3">
                    <p className="text-body-md text-on-background">
                      {t("nav.searchHintPrefix")}{" "}
                      <kbd className="text-label-caps border border-outline-variant rounded px-1 py-0.5">
                        ⌘K
                      </kbd>{" "}
                      /{" "}
                      <kbd className="text-label-caps border border-outline-variant rounded px-1 py-0.5">
                        Ctrl K
                      </kbd>{" "}
                      {t("nav.searchHintSuffix")}
                    </p>
                    <button
                      type="button"
                      onClick={dismissHint}
                      className="mt-2 text-label-caps text-primary-container hover:text-primary"
                    >
                      {t("nav.searchHintDismiss")}
                    </button>
                  </div>
                )}
              </div>
              <LanguageToggle compact={compact} locale={locale} switchLocale={switchLocale} t={t} />
              <NotificationBell />
              <AccountMenu compact={compact} />
              <button
                aria-label={menuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
                type="button"
                className="lg:hidden text-on-background p-1 shrink-0"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile / tablet full-screen menu (below lg). The header pill stays on
          top (z-50) so the close (X) button remains reachable. */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-surface transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <nav className="h-full flex flex-col items-stretch justify-center gap-1 pt-20 px-5 overflow-y-auto">
          {/* Self-contained account header so login / profile / logout are
              reachable from the drawer without relying on the top pill. */}
          <div className="px-1 mb-3">
            {session ? (
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "Profil"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-outline-variant shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-on-background truncate">
                    {session.user.name}
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="text-label-caps text-primary-container hover:text-primary"
                  >
                    {t("nav.viewProfile")}
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href={`/login?returnTo=${encodeURIComponent(currentPath)}`}
                onClick={() => setMenuOpen(false)}
                className="w-full block text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          {/* The burger menu is a vertical list, so the Jelajahi group that had
              to collapse on desktop can stay flat here. */}
          {[...NAV_LINKS, ...DISCOVER_LINKS].map((link) => {
            const active = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-center text-headline-sm sm:text-headline-md font-semibold py-3 rounded-lg ${
                  active
                    ? "text-primary bg-surface-container-low"
                    : "text-on-background hover:bg-surface-container-low"
                }`}
              >
                {t(link.labelKey)}
              </a>
            );
          })}

          <div className="px-1 mt-3 pt-3 border-t border-outline-variant flex justify-center">
            <LanguageToggle compact={false} locale={locale} switchLocale={switchLocale} t={t} />
          </div>
        </nav>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

// "Jelajahi"/"Explore" group. The flat bar cannot hold these three as well -
// measured at 1256px of links inside a 1200px pill - so they collapse into
// one trigger.
function DiscoverMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const active = DISCOVER_LINKS.some((l) => pathname === l.href || pathname.startsWith(l.href + "/"));
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 h-5 shrink-0 whitespace-nowrap font-medium ${
          active ? "text-primary" : "text-secondary hover:text-primary-container"
        }`}
      >
        {/* `block` + `leading-5` (not a bare text node) so this text's line box
            centers exactly like the sibling links' spans below - a flex child
            text node centers ~3px higher than a block span at the same font
            size, which read as the nav row being vertically unaligned. */}
        <span className="block leading-5">{t("discover.trigger")}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-3 z-50">
          <div className="w-72 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg p-2">
            {DISCOVER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <span className="block text-body-md text-on-background font-medium">{t(l.labelKey)}</span>
                <span className="block text-label-caps text-on-surface-variant">{t(l.descKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact quick-toggle - one click flips id <-> en, no dropdown, mirroring
// the "Switch to X" button on chongqing.ppitiongkok.com (the sibling chapter
// site this was asked to match). The visible label is the language you'd
// switch TO, same as that reference. Full save-to-profile picker lives at
// /profile (src/components/profile/language-selector.tsx) - this is just the
// always-visible shortcut.
function LanguageToggle({
  compact,
  locale,
  switchLocale,
  t,
}: {
  compact: boolean;
  locale: Locale;
  switchLocale: (next: Locale, origin?: Origin) => void;
  t: T;
}) {
  const target = otherLocale(locale);
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        switchLocale(target, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      aria-label={t("nav.switchLanguageAria", { lang: LOCALE_LABEL[target] })}
      title={LOCALE_LABEL[target]}
      className="flex items-center gap-1.5 text-on-background hover:bg-surface-container-low px-2 py-1.5 rounded-lg transition-colors shrink-0"
    >
      <Languages size={compact ? 20 : 18} />
      {!compact && <span className="text-label-caps font-medium">{LOCALE_SHORT[target]}</span>}
    </button>
  );
}
