"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Search, CornerDownLeft, Lock } from "lucide-react";
import { NAV_LINKS } from "@/lib/nav-links";

type ApiResult = {
  type: "event" | "news" | "job" | "gallery" | "inventory" | "page";
  title: string;
  subtitle?: string;
  href: string;
  locked?: boolean;
};

type ResultItem = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  kind: "page" | "event" | "news" | "job" | "gallery" | "inventory" | "action";
  action?: "logout";
  locked?: boolean;
};

type Section = { label: string; items: ResultItem[] };

function buildActions(session: { user?: { isAdmin?: boolean } } | null, isAdmin?: boolean): ResultItem[] {
  const actions: ResultItem[] = [
    { key: "action:profil", label: "Profil Saya", href: "/profile", kind: "action" },
  ];
  if (isAdmin) actions.push({ key: "action:console", label: "Masuk ke Console", href: "/console", kind: "action" });
  actions.push({ key: "action:sensus", label: "Isi Sensus", href: "/sensus", kind: "action" });
  if (session) {
    actions.push({ key: "action:logout", label: "Logout", href: "#", kind: "action", action: "logout" });
  } else {
    actions.push({ key: "action:login", label: "Login", href: "/login", kind: "action" });
  }
  return actions;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<ApiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = session?.user?.isAdmin;

  // Debounced content search against /api/search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      // Clear stale results synchronously when the query is too short.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const { sections, flatItems } = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      const secs: Section[] = [
        {
          label: "Halaman",
          items: NAV_LINKS.map((l) => ({
            key: `page:${l.href}`,
            label: l.label,
            href: l.href,
            kind: "page" as const,
          })),
        },
        { label: "Aksi", items: buildActions(session, isAdmin) },
      ];
      return { sections: secs, flatItems: secs.flatMap((s) => s.items) };
    }

    const pageItems = NAV_LINKS.filter((l) => l.label.toLowerCase().includes(q)).map((l) => ({
      key: `page:${l.href}`,
      label: l.label,
      href: l.href,
      kind: "page" as const,
    }));
    const actionItems = buildActions(session, isAdmin).filter((a) => a.label.toLowerCase().includes(q));

    const byType: Record<string, ResultItem[]> = {
      event: [],
      news: [],
      job: [],
      gallery: [],
      inventory: [],
      page: [],
    };
    results.forEach((r) =>
      byType[r.type].push({
        key: `${r.type}:${r.href}`,
        label: r.title,
        subtitle: r.subtitle,
        href: r.href,
        kind: r.type,
        locked: r.locked,
      }),
    );

    const groups: { label: string; type: keyof typeof byType }[] = [
      { label: "Events", type: "event" },
      { label: "Berita", type: "news" },
      { label: "Lowongan", type: "job" },
      { label: "Galeri", type: "gallery" },
      { label: "Inventaris", type: "inventory" },
      { label: "Halaman", type: "page" },
    ];

    const secs: Section[] = [];
    if (pageItems.length) secs.push({ label: "Halaman", items: pageItems });
    groups.forEach((g) => {
      if (byType[g.type].length) secs.push({ label: g.label, items: byType[g.type] });
    });
    if (actionItems.length) secs.push({ label: "Aksi", items: actionItems });

    return { sections: secs, flatItems: secs.flatMap((s) => s.items) };
  }, [query, results, session, isAdmin]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    // Reset the highlighted index whenever the result set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
  }, [query, results]);

  function go(item: ResultItem) {
    if (item.action === "logout") {
      signOut();
      onClose();
      return;
    }
    if (item.locked) {
      router.push(`/sensus?returnTo=${encodeURIComponent(item.href)}`);
      onClose();
      return;
    }
    router.push(item.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = Math.max(flatItems.length - 1, 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, last));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[Math.min(active, last)];
      if (item) go(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  const safeActive = Math.min(active, Math.max(flatItems.length - 1, 0));
  const showEmpty = query.trim().length >= 2 && !loading && flatItems.length === 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <Search size={18} className="text-secondary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cari event, berita, lowongan, galeri…"
            className="flex-1 bg-transparent outline-none text-body-md text-on-background placeholder:text-on-surface-variant"
          />
          {loading && <span className="text-label-caps text-on-surface-variant shrink-0">…</span>}
          <kbd className="text-label-caps text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5 shrink-0">
            ESC
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-2">
          {showEmpty && <li className="px-4 py-3 text-body-md text-on-surface-variant">Tidak ada hasil</li>}
          {sections.map((section) => (
            <li key={section.label}>
              <p className="px-4 pt-3 pb-1 text-label-caps text-on-surface-variant">{section.label}</p>
              <ul>
                {section.items.map((item) => {
                  const idx = flatItems.findIndex((i) => i.key === item.key);
                  const isActive = idx === safeActive;
                  return (
                    <li key={item.key}>
                      <button
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(item)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left ${
                          isActive ? "bg-surface-container-low" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span
                            className={`block text-body-md truncate ${
                              isActive ? "text-primary" : item.locked ? "text-on-surface-variant" : "text-on-background"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.subtitle && (
                            <span className="block text-label-caps text-on-surface-variant truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {item.locked && (
                            <span className="flex items-center gap-1 text-label-caps text-on-surface-variant">
                              <Lock size={13} /> sensus
                            </span>
                          )}
                          {isActive && <CornerDownLeft size={16} className="text-secondary" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-outline-variant text-label-caps text-on-surface-variant">
          <span>↑↓ navigasi</span>
          <span>↵ pilih</span>
          <span>esc tutup</span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}
