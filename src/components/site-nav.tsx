"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NAV_LINKS } from "@/lib/nav-links";

// Scroll-driven glass effect: fully off (transparent, no blur) at rest,
// fades the glass in as you scroll, reverses smoothly back to off scrolling
// back up. No width/shape animation - that turned out broken (the reference's
// own navbar is a fixed-height 50px pill at every scroll position, just
// resizing width within that same shape, not a bar that morphs into a pill -
// re-shaping our full-width bar into a floating capsule on scroll was the
// wrong read of it). The real ask was a shorter, more compressed bar height,
// which is the h-12/h-14 below, not a shape change.
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

  // Glass: fully off at rest (alpha 0, no blur) - fades in as you scroll,
  // fades back out on the way up. Everything below is a plain 0->1 ramp; the
  // actual smoothing/easing comes from the CSS `transition` on these
  // properties in the style block, not from the JS.
  const bgAlpha = 0.9 * progress; // 0 -> 0.9
  const blurPx = Math.round(progress * 20); // 0 -> 20px
  const shadowAlpha = (progress * 0.14).toFixed(3);
  const borderAlpha = (progress * 0.5).toFixed(3);

  return (
    <>
      <header className="w-full sticky top-0 z-50">
        <nav
          className="w-full"
          style={{
            backgroundColor: `rgba(255,248,247,${bgAlpha})`,
            backdropFilter: `blur(${blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurPx}px) saturate(140%)`,
            boxShadow: `0 10px 30px rgba(39,23,22,${shadowAlpha})`,
            borderBottom: `1px solid rgba(144,111,108,${borderAlpha})`,
            transition:
              "background-color 400ms ease, backdrop-filter 400ms ease, -webkit-backdrop-filter 400ms ease, box-shadow 400ms ease, border-color 400ms ease",
          }}
        >
          <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex justify-between items-center h-12 md:h-14">
            <a href="/" className="text-headline-md font-bold text-primary uppercase tracking-tight shrink-0">
              PPIT Nanjing
            </a>

            <div className="hidden md:flex items-center gap-8 text-body-md">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`relative overflow-hidden h-5 group ${active ? "text-primary" : "text-secondary"}`}
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

            <div className="flex items-center gap-1 md:gap-3">
              <NotificationBell />
              <AccountMenu />
              <button
                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                type="button"
                className="md:hidden text-on-background p-1"
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
