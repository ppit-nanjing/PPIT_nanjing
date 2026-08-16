import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { NotificationMarkAllReadButton } from "@/components/notifications/notification-bell";
import { BellOff } from "lucide-react";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/notifications")}`);

  const items = await listNotifications(session.user.id, 50);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-headline-lg text-on-background">Notifikasi</h1>
          {items.some((i) => !i.isRead) && <NotificationMarkAllReadButton />}
        </div>

        {items.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-20">
            <BellOff className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">Belum ada notifikasi</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              Kabar soal peminjaman, kehadiran kegiatan, dan usulan barang akan muncul di sini.
            </p>
          </div>
        ) : (
          <ul aria-label="Daftar notifikasi" className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                // One background class, picked by state - previously both
                // bg-surface-container-lowest and bg-primary-container/5 were
                // emitted for unread rows and which one won depended on CSS
                // order, not intent.
                className={`border rounded-xl p-4 ${
                  item.isRead
                    ? "bg-surface-container-lowest border-outline-variant"
                    : "bg-primary-container/5 border-primary-container/30"
                }`}
              >
                <p
                  className={`text-body-md ${
                    item.isRead ? "text-on-surface-variant" : "text-on-background font-medium"
                  }`}
                >
                  {/* Unread was signalled by background colour alone, which is
                      invisible to screen readers and to anyone who can't
                      distinguish the tint. */}
                  {!item.isRead && <span className="sr-only">Belum dibaca: </span>}
                  {item.title}
                </p>
                {item.body && <p className="text-body-md text-on-surface-variant mt-1">{item.body}</p>}
                <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mt-2 flex items-center gap-2">
                  {!item.isRead && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0"
                      aria-hidden
                    />
                  )}
                  <time dateTime={new Date(item.createdAt).toISOString()}>
                    {formatRelativeTime(new Date(item.createdAt))}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
