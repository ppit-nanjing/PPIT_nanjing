"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Width: shrinks from full-bleed down to a narrower floating pill as you
  // scroll. Shape stays a constant rounded-full pill throughout (see note
  // above) - only width/opacity/blur/shadow animate, never the radius.
  // Capped at 60%, not 40% - narrower than that leaves no room for the nav
  // links + account menu + bell, which were visibly compressing.
  const startWidthPct = 100;
  const endWidthPct = 60;
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
          <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex justify-between items-center gap-4 h-12 md:h-14">
            <a href="/" className="text-headline-md font-bold text-primary uppercase tracking-tight shrink-0 whitespace-nowrap">
              PPIT Nanjing
            </a>

            <div className="hidden md:flex items-center gap-4 lg:gap-6 text-body-md shrink-0">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative overflow-hidden h-5 shrink-0 whitespace-nowrap group ${active ? "text-primary" : "text-secondary"}`}
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

            <div className="flex items-center gap-1 md:gap-3 shrink-0">
              <NotificationBell />
              <AccountMenu />
              <button
                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                type="button"
                className="md:hidden text-on-background p-1 shrink-0"
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile full-screen menu overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-surface transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <nav className="h-full flex flex-col items-center justify-center gap-6 pt-16">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-headline-md font-semibold ${
                pathname === link.href ? "text-primary" : "text-on-background"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
