import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Set MAINTENANCE_MODE=true as a Vercel env var to redirect all traffic to
// /maintenance without a deploy. Excludes the maintenance page itself, static
// assets, and Next internals to avoid a redirect loop.
export function proxy(request: NextRequest) {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  const { pathname } = request.nextUrl;

  if (isMaintenance && pathname !== "/maintenance") {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)"],
};
