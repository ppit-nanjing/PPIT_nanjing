import { NextRequest, NextResponse } from "next/server";
import { publishDueEvents } from "@/lib/publish-events";

// Auto-publishes events whose scheduledPublishAt has passed. Triggered by an
// external scheduler (e.g. Vercel Cron via vercel.json) on a fixed interval, and
// guarded by CRON_SECRET so it can't be triggered by anonymous callers.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await publishDueEvents();
  return NextResponse.json({ ok: true });
}
