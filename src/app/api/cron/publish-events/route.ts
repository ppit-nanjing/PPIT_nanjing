import { NextRequest, NextResponse } from "next/server";
import { publishDueEvents } from "@/lib/publish-events";
import { rejectUnlessCron } from "@/lib/cron-auth";

// Auto-publishes events whose scheduledPublishAt has passed. Triggered by an
// external scheduler (e.g. Vercel Cron via vercel.json) on a fixed interval, and
// guarded by CRON_SECRET so it can't be triggered by anonymous callers.
export async function GET(req: NextRequest) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;

  await publishDueEvents();
  return NextResponse.json({ ok: true });
}
