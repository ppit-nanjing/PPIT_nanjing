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

function buildCsp(options: { designLab?: boolean; frameAncestors?: string } = {}) {
  const v = VERCEL_TOOLBAR_HOSTS;
  const designLab = options.designLab === true;
  // The temporary /design-lab mockups load Google Fonts (their audience is the
  // internal committee reviewing designs, not the mainland-China public), so
  // that one path gets the two Google Fonts hosts; everything else keeps
  // font-src 'self'. The rule is removed together with the design-lab folder.
  const googleStyle = designLab ? " https://fonts.googleapis.com" : "";
  const googleFont = designLab ? " https://fonts.gstatic.com" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${DEV_EVAL}${v}`,
    "worker-src 'self'",
    `style-src 'self' 'unsafe-inline'${googleStyle}`,
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.googleusercontent.com${v}`,
    `font-src 'self'${googleFont}`,
    `connect-src 'self'${v}`,
    // /organization/ad-art previews the admin-uploaded AD/ART PDF in an iframe
    // served from Blob storage. Without this, frame-src falls back through
    // child-src to default-src 'self' and the browser silently blocks the
    // preview - which would only show up once a real PDF is finally uploaded.
    `frame-src 'self' https://*.public.blob.vercel-storage.com${v}`,
    `frame-ancestors ${options.frameAncestors ?? "'none'"}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

// cameraPolicy is "(self)" only on the check-in scanner route and "()" everywhere
// else - the QR attendance scanner (/events/[slug]/scan) is the single
// feature that opens a camera, and a blanket camera=() makes getUserMedia fail
// there with "[Violation] Permissions policy violation: camera is not allowed".
function securityHeaders(cameraPolicy: string, frameOptions: "DENY" | "SAMEORIGIN" = "DENY") {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: frameOptions },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: `camera=${cameraPolicy}, microphone=(), geolocation=()`,
    },
  ];
}

const nextConfig: NextConfig = {
  // ngrok gives development tunnels a rotating *.ngrok-free.dev hostname.
  // Next.js blocks those origins unless they are explicitly allow-listed for
  // dev-only assets such as Turbopack chunks and HMR.
  allowedDevOrigins: ["*.ngrok-free.dev"],
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
        // rules below - overlapping rules would emit two conflicting
        // Permissions-Policy headers and browsers intersect them, which would
        // re-block the camera.
        //
        // This MUST track the actual scanner page's route (currently
        // /events/[slug]/scan). It used to be /console/events/[id]/scan -
        // when the scanner moved out of /console (see "move the attendance
        // scanner off /console"), this rule was never updated to match,
        // which silently re-blocked the camera on the real scanner page for
        // EVERY visitor on EVERY device (this header overrides whatever the
        // browser/OS camera permission says - the browser never even shows a
        // prompt). The old /console/events/[id]/scan path is now just a
        // redirect stub with no camera code, so it doesn't need this rule.
        source: "/events/:slug/scan",
        headers: [{ key: "Content-Security-Policy", value: buildCsp() }, ...securityHeaders("(self)")],
      },
      {
        // Temporary design-lab mockups + internal vote. Needs the Google Fonts
        // exception above, same-origin iframe framing (the vote page previews
        // mockups in an <iframe>), and must never be indexed; disjoint from the
        // scanner and catch-all rules, which both exclude this prefix.
        source: "/design-lab/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp({ designLab: true, frameAncestors: "'self'" }) },
          ...securityHeaders("()", "SAMEORIGIN"),
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Everything else: camera fully blocked (negative lookahead keeps the
        // scanner and design-lab routes out of this rule).
        source: "/((?!events/[^/]+/scan|design-lab/).*)",
        headers: [{ key: "Content-Security-Policy", value: buildCsp() }, ...securityHeaders("()")],
      },
    ];
  },
  // /career (dulu "Pusat Karir") digabung ke /jobs, yang sudah memuat seluruh
  // isinya. Pengalihan HTTP sungguhan lewat konfigurasi: redirect() di dalam
  // halaman yang sudah mulai di-stream hanya menghasilkan HTTP 200 + tag meta.
  // Sementara (307, bukan 308) supaya mudah dibalik. Sub-rute /career/guide/*
  // dan /career/mentorship* tetap ada dan tidak ikut dialihkan.
  async redirects() {
    return [{ source: "/career", destination: "/jobs", permanent: false }];
  },
};

export default nextConfig;
