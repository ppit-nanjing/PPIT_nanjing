import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Guard for /api/cron/*. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 *
 * Returns a response to send back when the caller must be rejected, or null when it
 * may proceed. A missing secret used to mean "no check at all"; in production that now
 * answers 503 (fail closed) so a mis-set or empty variable can never leave the
 * endpoints open again. Outside production (local dev, tests) a missing secret still
 * lets the route run so it can be called without ceremony.
 */
export function rejectUnlessCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
    }
    return null;
  }
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
