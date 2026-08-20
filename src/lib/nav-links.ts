// Shared nav link list, kept in its own plain module (no "use client") so
// server components (site-footer.tsx) can still import the actual array
// value - importing a const from a "use client" file resolves to an opaque
// client reference in server code, not the real value, which is what broke
// NAV_LINKS.map() in SiteFooter when site-nav.tsx became a client component.
//
// `labelKey` (a dictionary key), not `label` (resolved text) - this module
// has no access to the active locale, and a resolved string baked in here
// would never change when the user switches language. Callers resolve it
// via t(link.labelKey).
export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/about", labelKey: "nav.about" },
  { href: "/events", labelKey: "nav.events" },
  { href: "/news", labelKey: "nav.news" },
  { href: "/gallery", labelKey: "nav.gallery" },
  { href: "/jobs", labelKey: "nav.jobs" },
  { href: "/inventory", labelKey: "nav.inventory" },
] as const;

// Grouped behind a "Jelajahi"/"Explore" dropdown in the desktop bar. Measured:
// putting these inline takes the link row to 1256px inside a 1200px pill, so
// it overflows on ordinary laptop widths. The footer and burger menu still
// list them flat, where there is room.
export const DISCOVER_LINKS = [
  { href: "/universities", labelKey: "discover.universities.label", descKey: "discover.universities.desc" },
  { href: "/places", labelKey: "discover.places.label", descKey: "discover.places.desc" },
  { href: "/coverage", labelKey: "discover.coverage.label", descKey: "discover.coverage.desc" },
  { href: "/catalogue", labelKey: "discover.catalogue.label", descKey: "discover.catalogue.desc" },
] as const;
