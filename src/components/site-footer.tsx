"use client";

// Needs useT(), which only works under <LocaleProvider>'s client context.
// NAV_LINKS/DISCOVER_LINKS are plain non-"use client" modules so their real
// array values resolve on either side of the RSC boundary.
import { NAV_LINKS, DISCOVER_LINKS } from "@/lib/nav-links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AnimatedHeroHeading } from "@/components/animated-hero-heading";
import { DecoRule } from "@/components/deco/deco-rule";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ABOUT_LINKS = [
  { href: "/organization", labelKey: "footer.aboutLinks.structure" },
  { href: "/sensus", labelKey: "footer.aboutLinks.sensus" },
  { href: "/help", labelKey: "footer.aboutLinks.help" },
  { href: "/terms", labelKey: "footer.aboutLinks.terms" },
  { href: "/privacy", labelKey: "footer.aboutLinks.privacy" },
  { href: "/organization/ad-art", labelKey: "footer.aboutLinks.adart" },
] as const;

function FooterColumn({
  heading,
  links,
  twoColsOnPhone = false,
}: {
  heading: string;
  links: ReadonlyArray<{ href: string; labelKey: TKey }>;
  /** Lay the links out in two columns below `md` (for the column that spans the full phone width). */
  twoColsOnPhone?: boolean;
}) {
  const t = useT();
  return (
    // The group label is not a document heading - `<nav aria-label>` already
    // names it for assistive tech, and four footer <h2>s otherwise sit in the
    // page outline next to the real content sections.
    <nav aria-label={heading} className="flex flex-col gap-2 sm:gap-3">
      <p className="text-label-caps uppercase tracking-[0.2em] text-band-accent">{heading}</p>
      <ul className={twoColsOnPhone ? "grid grid-cols-2 gap-x-6 gap-y-0.5 md:flex md:flex-col md:gap-2" : "flex flex-col gap-0.5 md:gap-2"}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block py-0.5 text-body-sm text-on-band-muted hover:text-band-accent transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-band-accent rounded-sm"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// The footer is the dark Deco band (bg-band): unlike the old inverse-surface it
// stays dark in dark mode, so every colour here is a band token.
export function SiteFooter() {
  const t = useT();

  return (
    <footer className="relative w-full mt-10 sm:mt-16 overflow-hidden bg-band text-on-band px-[var(--spacing-container-padding)]">
      <div className="deco-lattice" aria-hidden="true" />
      <div className="relative z-10 max-w-[var(--container-max)] mx-auto pt-8 pb-5 sm:pt-14 sm:pb-8 flex flex-col gap-7 sm:gap-12">
        <div className="deco-frame rounded-md px-5 py-8 sm:px-8 sm:py-14 flex flex-col items-center text-center gap-4 sm:gap-6">
          <AnimatedHeroHeading
            as="h2"
            words={[t("footer.joinHeading")]}
            className="text-headline-lg sm:text-display-hero-mobile md:text-display-hero text-band-accent text-balance"
          />
          <DecoRule />
          <Link
            href="/join-us"
            className="deco-btn inline-flex items-center gap-2 bg-accent text-on-accent text-label-caps uppercase px-6 sm:px-8 py-3 sm:py-3.5 rounded-md hover:brightness-95 transition-[filter] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-band-accent focus-visible:ring-offset-2 focus-visible:ring-offset-band"
          >
            {t("footer.joinCta")} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-6 gap-y-7 md:gap-10">
          <div className="col-span-2 md:col-span-5 flex flex-col gap-2.5 sm:gap-4">
            <div className="flex items-center gap-3 text-band-accent">
              <span aria-hidden="true" className="brand-logo h-9 sm:h-12" />
              <span className="text-headline-sm uppercase tracking-[0.2em]">PPIT Nanjing</span>
            </div>
            <p className="text-body-sm text-on-band-muted max-w-xs">{t("footer.tagline")}</p>
            <a
              href="https://www.instagram.com/ppit_nanjing/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.instagramAria")}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-on-band/10 hover:bg-on-band/20 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-band-accent mt-0.5 sm:mt-1"
            >
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>

          <div className="md:col-span-2">
            <FooterColumn heading={t("footer.exploreHeading")} links={NAV_LINKS} />
          </div>
          <div className="md:col-span-2">
            <FooterColumn
              heading={t("footer.discoverHeading")}
              links={DISCOVER_LINKS.map(({ href, labelKey }) => ({ href, labelKey }))}
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <FooterColumn heading={t("footer.about")} links={ABOUT_LINKS} twoColsOnPhone />
          </div>
        </div>

        <div className="pt-4 sm:pt-6 border-t border-[var(--deco-line-soft)] flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-label-caps text-on-band-muted">&copy; {new Date().getFullYear()} PPIT Nanjing</p>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
