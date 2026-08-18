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
// The Vercel preview toolbar (vercel.live) injects a script on non-production
// deployments; without allow-listing it the browser logs a CSP violation and
// the toolbar feedback script is blocked. We only relax for non-production so
// the production perimeter stays tight.
const VERCEL_TOOLBAR_HOSTS = " https://vercel.live https://*.vercel.live";

function buildCsp(allowVercelToolbar: boolean) {
  const v = allowVercelToolbar ? VERCEL_TOOLBAR_HOSTS : "";
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
    const allowVercelToolbar = process.env.VERCEL_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp(allowVercelToolbar) },
          ...baseSecurityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
