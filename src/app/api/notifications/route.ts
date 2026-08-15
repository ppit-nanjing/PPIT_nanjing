import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsRead } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id),
    getUnreadNotificationCount(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await markAllNotificationsRead(session.user.id);
  return NextResponse.json({ ok: true });
}
