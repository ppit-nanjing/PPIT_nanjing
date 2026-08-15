import { AccountMenu } from "@/components/account-menu";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/jobs", label: "Careers" },
];

export function SiteNav() {
  return (
    <nav className="w-full sticky top-0 z-50 bg-surface shadow-[0_10px_30px_rgba(39,23,22,0.04)]">
      <div className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] flex justify-between items-center h-20">
        <a href="/" className="text-headline-md font-bold text-primary uppercase tracking-tight">
          PPIT Nanjing
        </a>
        <div className="hidden md:flex items-center gap-8 text-body-md">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-secondary font-medium hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <AccountMenu />
      </div>
    </nav>
  );
}
