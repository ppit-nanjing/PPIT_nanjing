import { NAV_LINKS } from "@/components/site-nav";

export function SiteFooter() {
  return (
    <footer className="w-full bg-inverse-surface text-inverse-on-surface py-12 mt-16">
      <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex flex-col md:flex-row justify-between items-center gap-6">
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
    </footer>
  );
}
