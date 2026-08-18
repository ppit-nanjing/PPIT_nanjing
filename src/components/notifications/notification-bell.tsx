"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck } from "lucide-react";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { Tooltip } from "@/components/ui/tooltip";
import Link from "next/link";

type NItem = {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
};

function hrefFor(item: NItem): string | null {
  if (item.relatedEntityType === "borrow_request") return "/profile/submissions";
  if (item.relatedEntityType === "event_registration") return "/profile/submissions";
  return null;
}

export function NotificationBell() {
  const { status } = useSession();
  const pathname = usePathname();
  const [items, setItems] = useState<NItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // Non-fatal: bell just stays empty if the request fails.
    }
  }, []);

  useEffect(() => {
    // Fetch notifications once the session is authenticated (external data sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (status === "authenticated") load();
  }, [status, pathname, load]);

  if (status !== "authenticated") return null;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  }

  return (
    <div className="relative">
      <Tooltip label="Notifikasi">
        <button
          type="button"
          aria-label="Notifikasi"
          onClick={() => setOpen((v) => !v)}
          className="relative text-on-background p-1 hover:bg-surface-container-low rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute top-full mt-2 z-50 overflow-hidden bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg right-2 w-[calc(100vw-1rem)] m:right-0 m:w-80">
          <div className="flex items-center justify-between gap-2 px-3 m:px-4 py-3 border-b border-outline-variant">
            <span className="text-body-md font-semibold text-on-background">Notifikasi</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-label-caps uppercase tracking-wide text-primary-container hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <CheckCheck size={14} /> Tandai dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-body-sm text-on-surface-variant text-center">Belum ada notifikasi.</p>
            ) : (
              items.map((item) => {
                const href = hrefFor(item);
                const content = (
                  <>
                    <p className={`text-body-sm ${item.isRead ? "text-on-surface-variant" : "text-on-background font-medium"}`}>
                      {item.title}
                    </p>
                    {item.body && <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">{item.body}</p>}
                    <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mt-1">
                      {formatRelativeTime(new Date(item.createdAt))}
                    </p>
                  </>
                );
                return href ? (
                  <a
                    key={item.id}
                    href={href}
                    onClick={() => setOpen(false)}
                className={`block px-3 m:px-4 py-3 border-b border-outline-variant hover:bg-surface-container-low transition-colors ${item.isRead ? "" : "bg-primary-container/5"}`}
                   >
                    {content}
                  </a>
                ) : (
                  <div
                    key={item.id}
                    className={`block px-3 m:px-4 py-3 border-b border-outline-variant ${item.isRead ? "" : "bg-primary-container/5"}`}
                  >
                    {content}
                  </div>
                );
              })
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block px-3 m:px-4 py-2 text-center text-label-caps uppercase tracking-wide text-primary-container hover:bg-surface-container-low transition-colors border-t border-outline-variant"
          >
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}

export function NotificationMarkAllReadButton() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  async function onClick() {
    await fetch("/api/notifications", { method: "POST" });
    setDone(true);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className="flex items-center gap-2 text-label-caps uppercase tracking-wide text-primary-container hover:underline disabled:opacity-60"
    >
      <CheckCheck size={14} /> {done ? "Sudah dibaca" : "Tandai semua dibaca"}
    </button>
  );
}
