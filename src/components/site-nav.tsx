"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Menu, X, Search, User } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { NAV_LINKS } from "@/lib/nav-links";

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
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { data: session } = useSession();
  const [showHint, setShowHint] = useState(false);

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
        setShowHint(true);
        const t = setTimeout(() => setShowHint(false), 7000);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
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
  const width = isDesktop && scrolled ? "min(100%, 1000px)" : "100%";
  // Everything (account menu, search) collapses to icon-only when shrunk.
  const compact = isDesktop && scrolled;

  // Glass + shadow appear on scroll only; opaque & flat at rest.
  const bgAlpha = scrolled ? 0.82 : 1;
  const blurPx = scrolled ? 12 : 0;
  const shadowAlpha = scrolled ? 0.14 : 0;

  return (
    <>
      <header className="w-full sticky top-0 z-50 flex justify-center p-2.5">
        <nav
          className="rounded-full"
          style={{
            width,
            maxWidth: "var(--container-max)",
            backgroundColor: `rgba(255,248,247,${bgAlpha})`,
            backdropFilter: `blur(${blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurPx}px) saturate(140%)`,
            boxShadow: `0 10px 30px rgba(39,23,22,${shadowAlpha})`,
            transition:
              "width 350ms cubic-bezier(0.22, 1, 0.36, 1), background-color 350ms ease, backdrop-filter 350ms ease, -webkit-backdrop-filter 350ms ease, box-shadow 350ms ease",
          }}
        >
          <div className="max-w-[var(--container-max)] mx-auto flex justify-between items-center gap-2 sm:gap-4 h-12 md:h-14 px-4 sm:px-6">
            <a
              href="/"
              className="text-headline-sm sm:text-headline-md font-bold text-primary uppercase tracking-tight shrink-0 whitespace-nowrap"
            >
              PPIT Nanjing
            </a>

            {/* Inline links: desktop (lg) and up only - narrower viewports use
                the burger menu below. */}
            <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-body-md shrink-0">
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
                    <span className="block transition-transform duration-200 ease-out group-hover:-translate-y-5 font-medium">
                      {link.label}
                    </span>
                    <span className="block absolute inset-0 translate-y-5 transition-transform duration-200 ease-out group-hover:translate-y-0 text-primary-container font-medium">
                      {link.label}
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <div className="relative">
                {/* Desktop, expanded: labeled search pill that advertises the
                    shortcut. Collapses to icon-only when the navbar shrinks. */}
                <button
                  aria-label="Cari (Ctrl/⌘ + K)"
                  type="button"
                  onClick={() => {
                    setPaletteOpen(true);
                    dismissHint();
                  }}
                  className={`${compact ? "hidden" : "hidden lg:flex"} items-center gap-2 bg-surface-container-low text-on-surface-variant rounded-full pl-3 pr-2 py-1.5 text-body-md hover:bg-surface-container transition-colors`}
                >
                  <Search size={16} />
                  <span>Cari…</span>
                  <kbd className="text-label-caps border border-outline-variant rounded px-1.5 py-0.5">⌘K</kbd>
                </button>
                {/* Icon-only trigger: mobile/tablet, and also desktop once the
                    navbar has shrunk (no keyboard shortcut hint needed then). */}
                <button
                  aria-label="Cari"
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
                      Tekan{" "}
                      <kbd className="text-label-caps border border-outline-variant rounded px-1 py-0.5">
                        ⌘K
                      </kbd>{" "}
                      /{" "}
                      <kbd className="text-label-caps border border-outline-variant rounded px-1 py-0.5">
                        Ctrl K
                      </kbd>{" "}
                      untuk mencari cepat di semua halaman.
                    </p>
                    <button
                      type="button"
                      onClick={dismissHint}
                      className="mt-2 text-label-caps text-primary-container hover:text-primary"
                    >
                      Mengerti
                    </button>
                  </div>
                )}
              </div>
              <NotificationBell />
              <AccountMenu compact={compact} />
              <button
                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
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
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "Profil"}
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
                  <a
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="text-label-caps text-primary-container hover:text-primary"
                  >
                    Lihat Profil
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signIn("google");
                }}
                className="w-full bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
              >
                Login
              </button>
            )}
          </div>

          {NAV_LINKS.map((link) => {
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
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}
