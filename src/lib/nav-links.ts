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

// Grouped behind a "Jelajahi" dropdown in the desktop bar. Measured: putting
// these inline takes the link row to 1256px inside a 1200px pill, so it
// overflows on ordinary laptop widths. The footer and burger menu still list
// them flat, where there is room.
export const DISCOVER_LINKS = [
  { href: "/universities", label: "Kampus", desc: "Direktori universitas di Nanjing" },
  { href: "/places", label: "Tempat", desc: "Wisata, rumah ibadah, dan lokasi penting" },
  { href: "/coverage", label: "Wilayah", desc: "9 kota naungan PPIT Nanjing" },
  { href: "/catalogue", label: "Katalog", desc: "Merchandise, donasi, dan sponsorship" },
];
