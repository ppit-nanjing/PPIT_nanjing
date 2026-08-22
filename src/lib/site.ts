import { headers } from "next/headers";

// Origin situs saat ini, diambil dari header request agar otomatis menyesuaikan
// baik di preview Vercel (*.vercel.app) maupun setelah migrasi ke custom domain
// (nanjing.ppitiongkok.com). Hindari hardcode base URL di UI.
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}
