import { NextRequest, NextResponse } from "next/server";
import { markOverdueBorrows } from "@/lib/mark-overdue";
import { rejectUnlessCron } from "@/lib/cron-auth";

// Menandai peminjaman yang lewat jatuh tempo sebagai "overdue" + memberi tahu
// peminjamnya. Dipicu penjadwal eksternal (Vercel Cron via vercel.json) dan
// dijaga CRON_SECRET seperti /api/cron/publish-events.
export async function GET(req: NextRequest) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;

  const marked = await markOverdueBorrows();
  return NextResponse.json({ ok: true, marked });
}
