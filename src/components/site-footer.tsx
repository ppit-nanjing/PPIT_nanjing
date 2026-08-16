import { NAV_LINKS } from "@/lib/nav-links";
import { AnimatedLettersHeading } from "@/components/animated-letters-heading";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const SOCIALS = [{ label: "Instagram PPIT Nanjing", href: "https://www.instagram.com/ppit_nanjing/" }];

const ABOUT_LINKS = [
  { href: "/organization", label: "Struktur Organisasi" },
  { href: "/sensus", label: "Isi Sensus" },
  { href: "/terms", label: "Ketentuan" },
  { href: "/privacy", label: "Privasi" },
  { href: "/organization/ad-art", label: "AD/ART" },
];

export function SiteFooter() {
  return (
    <footer className="w-full mt-16 px-[var(--spacing-container-padding)]">
      <div className="max-w-[var(--container-max)] mx-auto bg-primary-container text-on-primary rounded-2xl px-8 py-14 flex flex-col items-center text-center gap-8">
        <AnimatedLettersHeading
          text="Ayo bergabung dengan PPIT Nanjing."
          className="text-display-hero-mobile md:text-display-hero"
        />
        <Link
          href="/join-us"
          className="inline-flex items-center gap-2 bg-on-primary text-primary-container text-label-caps uppercase tracking-wide px-8 py-3.5 rounded-full hover:bg-on-primary/90 transition-colors"
        >
          Gabung Sekarang <ArrowRight size={16} />
        </Link>
      </div>

      <div className="max-w-[var(--container-max)] mx-auto py-12">
        <div className="bg-inverse-surface text-inverse-on-surface rounded-2xl px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-headline-md font-bold uppercase">PPIT Nanjing</span>
          <div className="text-body-md flex gap-2 flex-wrap justify-center">
            {NAV_LINKS.map((link, i) => (
              <span key={link.href}>
                <a href={link.href} className="hover:text-primary-fixed-dim transition-colors">
                  {link.label}
                </a>
                {i < NAV_LINKS.length - 1 && <span className="mx-2 opacity-40">|</span>}
              </span>
            ))}
          </div>
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-label-caps uppercase opacity-70">Tentang</span>
            <div className="text-body-md flex gap-2 flex-wrap justify-center">
              {ABOUT_LINKS.map((link, i) => (
                <span key={link.href}>
                  <a href={link.href} className="hover:text-primary-fixed-dim transition-colors">
                    {link.label}
                  </a>
                  {i < ABOUT_LINKS.length - 1 && <span className="mx-2 opacity-40">|</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-inverse-on-surface/10 hover:bg-inverse-on-surface/20 transition-colors"
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
            ))}
            <p className="text-label-caps opacity-70">&copy; 2026 PPIT Nanjing</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
