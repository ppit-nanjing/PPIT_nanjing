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

// React dalam mode pengembangan memakai eval() untuk fitur debug-nya (antara
// lain menyusun ulang callstack lintas lingkungan). Tanpa 'unsafe-eval', konsol
// dipenuhi "eval() is not supported in this environment" di setiap halaman dan
// jejak error jadi lebih miskin.
//
// HANYA saat development. NODE_ENV bernilai "production" waktu `next build`
// dijalankan, jadi ini tidak pernah ikut ke berkas produksi - dan memang tidak
// boleh: 'unsafe-eval' mencabut salah satu perlindungan utama CSP terhadap XSS.
// React sendiri tidak pernah memakai eval() di mode produksi.
const DEV_EVAL = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

function buildCsp() {
  const v = VERCEL_TOOLBAR_HOSTS;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${DEV_EVAL}${v}`,
    "worker-src 'self'",
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

// cameraPolicy is "(self)" only on the check-in scanner route and "()" everywhere
// else - the QR attendance scanner (/console/events/[id]/scan) is the single
// feature that opens a camera, and a blanket camera=() makes getUserMedia fail
// there with "[Violation] Permissions policy violation: camera is not allowed".
function securityHeaders(cameraPolicy: string) {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: `camera=${cameraPolicy}, microphone=(), geolocation=(), browsing-topics=()`,
    },
  ];
}

const nextConfig: NextConfig = {
  // Default Server Action body limit is 1MB, which silently rejects most
  // real documents (scanned PDFs, signed contracts) uploaded via
  // uploadDriveFileAction in the Dokumen module. Raised, but capped at 4mb -
  // NOT higher - because Vercel Functions enforce a hard, non-configurable
  // 4.5MB request body ceiling (https://vercel.com/docs/functions/limitations)
  // that this setting cannot override; anything closer to 4.5MB risks
  // tripping it once multipart/form-data boundary overhead is added. Files
  // larger than this will still fail; that requires bypassing the
  // serverless function entirely (e.g. direct-to-storage upload), which is
  // out of scope for this limit bump.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
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
        // Only route where the camera is allowed. Must stay disjoint from the
        // rule below - overlapping rules would emit two conflicting
        // Permissions-Policy headers and browsers intersect them, which would
        // re-block the camera.
        source: "/console/events/:id/scan",
        headers: [{ key: "Content-Security-Policy", value: buildCsp() }, ...securityHeaders("(self)")],
      },
      {
        // Everything else: camera fully blocked (negative lookahead keeps the
        // scanner route out of this rule).
        source: "/((?!console/events/[^/]+/scan).*)",
        headers: [{ key: "Content-Security-Policy", value: buildCsp() }, ...securityHeaders("()")],
      },
    ];
  },
};

export default nextConfig;
