"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Menu, X, Search, User } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { NAV_LINKS } from "@/lib/nav-links";

// Scroll-driven shrink + glass, corrected to match the reference's actual
// mechanics (docs: reference's .navbar is ALWAYS a fixed-height, fully
// rounded pill at every scroll position - border-radius never animates,
// only width does - and its `navbar-header` wrapper always carries a small
// fixed padding so the pill never touches the viewport edge). Solid opaque
// white at rest (no blur); the translucent glass look and blur only appear
// as it shrinks, and even then stays fairly solid - not an aggressive see-
// through effect.
function useScrollProgress(maxScroll = 300) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const y = Math.max(window.scrollY, 0);
      setProgress(Math.min(y / maxScroll, 1));
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [maxScroll]);

  return progress;
}

export function SiteNav() {
  const pathname = usePathname();
  const progress = useScrollProgress();
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

  // Lock body scroll while the mobile/tablet menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Width: shrinks from full-bleed down to a narrower floating pill on desktop
  // only. On mobile/tablet it stays essentially full-width. Shape stays a
  // constant rounded-full pill throughout - only width/opacity/blur/shadow
  // animate, never the radius.
  const startWidthPct = 100;
  const endWidthPct = isDesktop ? 60 : 100;
  const widthPct = startWidthPct - (startWidthPct - endWidthPct) * progress;

  // Opacity/blur: solid opaque white (alpha 1, no blur) at rest. As you
  // shrink, it eases into a translucent glass look - kept fairly solid
  // (alpha floor ~0.82, not an aggressive see-through) rather than a heavy
  // frosted effect.
  const bgAlpha = 1 - 0.18 * progress; // 1 -> 0.82
  const blurPx = Math.round(progress * 14); // 0 -> 14px
  const shadowAlpha = (progress * 0.14).toFixed(3);

  return (
    <>
      <header className="w-full sticky top-0 z-50 flex justify-center p-2.5">
        <nav
          className="rounded-full"
          style={{
            width: `min(100%, ${widthPct}%)`,
            maxWidth: "var(--container-max)",
            backgroundColor: `rgba(255,248,247,${bgAlpha})`,
            backdropFilter: `blur(${blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurPx}px) saturate(140%)`,
            boxShadow: `0 10px 30px rgba(39,23,22,${shadowAlpha})`,
            transition:
              "width 400ms ease, background-color 400ms ease, backdrop-filter 400ms ease, -webkit-backdrop-filter 400ms ease, box-shadow 400ms ease",
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
                {/* Desktop: labeled search pill that advertises the shortcut. */}
                <button
                  aria-label="Cari (Ctrl/⌘ + K)"
                  type="button"
                  onClick={() => {
                    setPaletteOpen(true);
                    dismissHint();
                  }}
                  className="hidden lg:flex items-center gap-2 bg-surface-container-low text-on-surface-variant rounded-full pl-3 pr-2 py-1.5 text-body-md hover:bg-surface-container transition-colors"
                >
                  <Search size={16} />
                  <span>Cari…</span>
                  <kbd className="text-label-caps border border-outline-variant rounded px-1.5 py-0.5">⌘K</kbd>
                </button>
                {/* Mobile / tablet: icon only (no keyboard shortcut there). */}
                <button
                  aria-label="Cari"
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="lg:hidden text-on-background p-1 shrink-0"
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
              <AccountMenu />
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
