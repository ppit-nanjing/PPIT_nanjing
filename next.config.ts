import type { NextConfig } from "next";

// Security hardening applied to every response. The site already escapes all
// user content (React) and parameterizes every query (Drizzle), so these
// headers are the defensive perimeter that makes "View Source" / DevTools
// inspection clean: no clickjacking, no MIME sniffing, no mixed content,
// and a tight Content-Security-Policy.
//
// NOTE on script-src: Next.js App Router inlines the RSC flight payload as
// inline <script> tags, so a strict CSP without 'unsafe-inline' would break
// the app. We keep 'unsafe-inline' for scripts (React's escaping remains the
// primary XSS defense) but lock down everything else, especially
// frame-ancestors 'none' and form-action 'self'.
//
// The Vercel Toolbar (vercel.live) injects its feedback/assist scripts on
// Vercel deployments where the toolbar is enabled - which can be a preview OR
// a production deployment, so gating the allow-list on VERCEL_ENV reliably
// misses the production case and the browser then blocks the script. We
// always allow-list Vercel's own toolbar hosts (matching Vercel's own CSP
// guidance); on self-hosted production the toolbar never injects anything, so
// the allow-list is inert there.
const VERCEL_TOOLBAR_HOSTS = " https://vercel.live https://*.vercel.live";

function buildCsp() {
  const v = VERCEL_TOOLBAR_HOSTS;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${v}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.googleusercontent.com${v}`,
    "font-src 'self'",
    `connect-src 'self'${v}`,
    // /organization/ad-art previews the admin-uploaded AD/ART PDF in an iframe
    // served from Blob storage. Without this, frame-src falls back through
    // child-src to default-src 'self' and the browser silently blocks the
    // preview - which would only show up once a real PDF is finally uploaded.
    `frame-src 'self' https://*.public.blob.vercel-storage.com${v}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

const baseSecurityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.githubusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp() },
          ...baseSecurityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
