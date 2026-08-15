import { NAV_LINKS } from "@/lib/nav-links";
import { AnimatedLettersHeading } from "@/components/animated-letters-heading";
import { ArrowRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="w-full mt-16 px-[var(--spacing-container-padding)]">
      <div className="max-w-[var(--container-max)] mx-auto bg-primary-container text-on-primary rounded-2xl px-8 py-14 flex flex-col items-center text-center gap-8">
        <AnimatedLettersHeading
          text="Ayo bergabung dengan PPIT Nanjing."
          className="text-headline-lg md:text-display-hero-mobile"
        />
        <a
          href="/join-us"
          className="inline-flex items-center gap-2 bg-on-primary text-primary-container text-label-caps uppercase tracking-wide px-8 py-3.5 rounded-full hover:bg-on-primary/90 transition-colors"
        >
          Gabung Sekarang <ArrowRight size={16} />
        </a>
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
          <p className="text-label-caps opacity-70">&copy; 2026 PPIT Nanjing</p>
        </div>
      </div>
    </footer>
  );
}
