import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { runGlobalSearch } from "@/lib/global-search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const session = await auth();
  const hasSensus = session?.user?.id ? await hasCompletedSensus(session.user.id) : false;
  const results = await runGlobalSearch(q, hasSensus);
  return NextResponse.json({ results });
}
