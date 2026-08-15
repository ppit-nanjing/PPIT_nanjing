import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { NotificationMarkAllReadButton } from "@/components/notifications/notification-bell";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
          <p className="text-body-md text-on-surface-variant">Belum ada notifikasi untuk akun kamu.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 ${
                  item.isRead ? "" : "bg-primary-container/5"
                }`}
              >
                <p className={`text-body-md ${item.isRead ? "text-on-surface-variant" : "text-on-background font-medium"}`}>
                  {item.title}
                </p>
                {item.body && <p className="text-body-md text-on-surface-variant mt-1">{item.body}</p>}
                <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mt-2">
                  {formatRelativeTime(new Date(item.createdAt))}
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
