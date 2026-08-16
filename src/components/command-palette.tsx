"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV_LINKS } from "@/lib/nav-links";

type Item = { label: string; href?: string; kind: "link" | "action" | "logout" };

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = session?.user?.isAdmin;

  const allItems: Item[] = useMemo(() => {
    const links = NAV_LINKS.map((l) => ({ label: l.label, href: l.href, kind: "link" as const }));
    const actions: Item[] = [{ label: "Profil Saya", href: "/profile", kind: "action" as const }];
    if (isAdmin) actions.push({ label: "Masuk ke Console", href: "/console", kind: "action" as const });
    actions.push(session ? { label: "Logout", kind: "logout" as const } : { label: "Login", href: "/login", kind: "action" as const });
    return [...links, ...actions];
  }, [session, isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, allItems]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(item: Item) {
    if (item.kind === "logout") {
      signOut();
      onClose();
      return;
    }
    if (item.href) router.push(item.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) go(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

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
            placeholder="Cari halaman atau aksi…"
            className="flex-1 bg-transparent outline-none text-body-md text-on-background placeholder:text-on-surface-variant"
          />
          <kbd className="text-label-caps text-on-surface-variant border border-outline-variant rounded px-1.5 py-0.5 shrink-0">
            ESC
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-body-md text-on-surface-variant">Tidak ada hasil</li>
          )}
          {filtered.map((item, i) => (
            <li key={item.label}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(item)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-body-md ${
                  i === active ? "bg-surface-container-low text-primary" : "text-on-background"
                }`}
              >
                <span>{item.label}</span>
                {i === active && <CornerDownLeft size={16} className="text-secondary shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
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
