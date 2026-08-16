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
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
