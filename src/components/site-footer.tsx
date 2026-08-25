"use client";

// Needs useT(), which only works under <LocaleProvider>'s client context.
// NAV_LINKS/DISCOVER_LINKS are plain non-"use client" modules so their real
// array values resolve on either side of the RSC boundary.
import { NAV_LINKS, DISCOVER_LINKS } from "@/lib/nav-links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AnimatedLettersHeading } from "@/components/animated-letters-heading";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ABOUT_LINKS = [
  { href: "/organization", labelKey: "footer.aboutLinks.structure" },
  { href: "/sensus", labelKey: "footer.aboutLinks.sensus" },
  { href: "/terms", labelKey: "footer.aboutLinks.terms" },
  { href: "/privacy", labelKey: "footer.aboutLinks.privacy" },
  { href: "/organization/ad-art", labelKey: "footer.aboutLinks.adart" },
] as const;

function FooterColumn({ heading, links }: { heading: string; links: ReadonlyArray<{ href: string; labelKey: TKey }> }) {
  const t = useT();
  return (
    <nav aria-label={heading} className="flex flex-col gap-3">
      <h2 className="text-label-caps uppercase tracking-wide text-inverse-on-surface/60">{heading}</h2>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-body-sm text-inverse-on-surface/90 hover:text-primary-fixed-dim transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary rounded-sm"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const t = useT();

  return (
    <footer className="w-full mt-16 bg-inverse-surface text-inverse-on-surface px-[var(--spacing-container-padding)]">
      <div className="max-w-[var(--container-max)] mx-auto pt-14 pb-8 flex flex-col gap-12">
        <div className="bg-primary-container text-on-primary rounded-2xl px-8 py-14 flex flex-col items-center text-center gap-8">
          <AnimatedLettersHeading
            text={t("footer.joinHeading")}
            className="text-display-hero-mobile md:text-display-hero"
          />
          <Link
            href="/join-us"
            className="inline-flex items-center gap-2 bg-on-primary text-primary-container text-label-caps uppercase tracking-wide px-8 py-3.5 rounded-full hover:bg-on-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary focus-visible:ring-offset-2 focus-visible:ring-offset-primary-container"
          >
            {t("footer.joinCta")} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 flex flex-col gap-4">
            <span className="text-headline-md font-bold uppercase">PPIT Nanjing</span>
            <p className="text-body-sm text-inverse-on-surface/70 max-w-xs">{t("footer.tagline")}</p>
            <a
              href="https://www.instagram.com/ppit_nanjing/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.instagramAria")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-inverse-on-surface/10 hover:bg-inverse-on-surface/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-primary mt-1"
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
          <div className="md:col-span-3">
            <FooterColumn heading={t("footer.about")} links={ABOUT_LINKS} />
          </div>
        </div>

        <div className="pt-6 border-t border-current/15 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-label-caps text-inverse-on-surface/60">
            &copy; {new Date().getFullYear()} PPIT Nanjing
          </p>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
