// The app is intentionally domain-agnostic (no hardcoded *.vercel.app, no
// NEXT_PUBLIC_SITE_URL - see docs/Migrasi Subdomain ppitiongkok.md), so this
// only exists for the one place a relative path can't work: a link inside an
// email client. VERCEL_PROJECT_PRODUCTION_URL is Vercel's stable alias for
// whatever domain production currently uses (survives the subdomain move);
// VERCEL_URL (this deployment's own URL) is the fallback if that's unset.
export function getSiteUrl(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
