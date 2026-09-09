import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Liveness / readiness probe for an external uptime monitor (e.g. UptimeRobot).
//
// GET /api/health          -> 200 as long as the app is serving requests.
// GET /api/health?deep=1   -> also runs a trivial `SELECT 1` against Neon and
//                             returns 503 if the database is unreachable.
//
// No auth: it exposes nothing an anonymous visitor could not already infer, and
// a monitor cannot send credentials. The body is intentionally minimal - no
// version, commit, env, or connection detail.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get("deep");
  const noStore = { "Cache-Control": "no-store" };

  if (!deep) {
    return NextResponse.json({ status: "ok" }, { headers: noStore });
  }

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "ok" }, { headers: noStore });
  } catch {
    return NextResponse.json(
      { status: "degraded", db: "unreachable" },
      { status: 503, headers: noStore },
    );
  }
}
