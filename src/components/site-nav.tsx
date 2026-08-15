"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NAV_LINKS } from "@/lib/nav-links";

// Scroll-driven glass capsule effect, ported from the website-portofolio
// Navbar reference: shrinks + gains blur/shadow as you scroll, re-expressed
// with this project's own surface/shadow tokens (kept solid enough to stay
// legible over the homepage's dark hero, unlike the reference's near-
// transparent starting state - see docs/Motion & Animation.md's a11y note on
// respecting reduced-motion/legibility over literal fidelity).
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

  // Desktop: full-bleed bar (100%) shrinks into a floating capsule (72%) as
  // you scroll. Mobile stays nearly full-width - shrinking is a desktop-only
  // flourish, not something worth fighting for screen space on a phone.
  const startWidthPct = 100;
  const endWidthPct = 72;
  const widthPct = startWidthPct - (startWidthPct - endWidthPct) * progress;

  // Glass: background stays translucent throughout (never fully opaque) so
  // the backdrop-blur is actually visible as a frosted-glass wash, not just a
  // flat color sitting on top of blurred nothing. Blur/opacity both ramp with
  // scroll for the "more glass the further you scroll" feel.
  const bgAlpha = 0.55 + 0.35 * progress; // 0.55 -> 0.90
  const blurPx = Math.round(10 + progress * 14); // 10px -> 24px, always on
  const shadowAlpha = (progress * 0.14).toFixed(3);
  const borderAlpha = (progress * 0.5).toFixed(3);
  const radiusPx = Math.round(progress * 999);

  return (
    <>
      <header className="w-full sticky top-0 z-50 flex justify-center pt-0 md:pt-3 transition-[padding] duration-300">
        <nav
          className="w-full md:transition-[width] md:duration-300 md:ease-out"
          style={{
            width: `min(100%, ${widthPct}%)`,
            maxWidth: "var(--container-max)",
            backgroundColor: `rgba(255,248,247,${bgAlpha})`,
            backdropFilter: `blur(${blurPx}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurPx}px) saturate(140%)`,
            boxShadow: `0 10px 30px rgba(39,23,22,${shadowAlpha})`,
            border: `1px solid rgba(144,111,108,${borderAlpha})`,
            borderRadius: `${radiusPx}px`,
          }}
        >
          <div className="px-[var(--spacing-container-padding)] flex justify-between items-center h-16 md:h-20">
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
