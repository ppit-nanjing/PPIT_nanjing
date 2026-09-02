import { NextRequest, NextResponse } from "next/server";
import { markOverdueBorrows } from "@/lib/mark-overdue";

// Menandai peminjaman yang lewat jatuh tempo sebagai "overdue" + memberi tahu
// peminjamnya. Dipicu penjadwal eksternal (Vercel Cron via vercel.json) dan
// dijaga CRON_SECRET seperti /api/cron/publish-events.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const marked = await markOverdueBorrows();
  return NextResponse.json({ ok: true, marked });
}
