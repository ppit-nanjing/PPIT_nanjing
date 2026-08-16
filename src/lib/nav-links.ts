// Shared nav link list, kept in its own plain module (no "use client") so
// server components (site-footer.tsx) can still import the actual array
// value - importing a const from a "use client" file resolves to an opaque
// client reference in server code, not the real value, which is what broke
// NAV_LINKS.map() in SiteFooter when site-nav.tsx became a client component.
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/jobs", label: "Lowongan" },
  { href: "/inventory", label: "Inventaris" },
];
