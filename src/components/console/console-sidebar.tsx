"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_GROUPS, canSeeNavItem } from "@/lib/console-nav";
import Link from "next/link";

const COLLAPSE_KEY = "console.sidebar.collapsed";

function NavContent({
  scope,
  isCommittee = false,
  isBphCommittee = false,
  isCoordinator = false,
  canCreateSurvey = false,
  canCreateEvent = false,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  scope: "full" | string[] | null;
  isCommittee?: boolean;
  isBphCommittee?: boolean;
  isCoordinator?: boolean;
  canCreateSurvey?: boolean;
  canCreateEvent?: boolean;
  pathname: string;
  onNavigate: () => void;
  collapsed?: boolean;
}) {
  const isActive = (href: string) =>
    href === "/console" ? pathname === "/console" : pathname.startsWith(href);

  return (
    <nav className={`flex-1 py-2 overflow-y-auto ${collapsed ? "px-2" : ""}`}>
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((i) =>
          canSeeNavItem(i, { scope, isCommittee, isBphCommittee, isCoordinator, canCreateSurvey, canCreateEvent }),
        );
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="mb-2">
            {!collapsed && (
              <p className="px-6 pt-4 pb-1 text-label-caps uppercase tracking-wide text-on-surface-variant text-xs">
                {group.title}
              </p>
            )}
            {collapsed && <div className="mx-auto my-2 h-px w-8 bg-outline-variant" />}
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? `${item.label}: ${item.hint}` : item.hint}
                  className={`relative flex items-center text-body-md transition-colors ${
                    collapsed ? "justify-center px-0 py-3" : "gap-3 px-6 py-3"
                  } ${
                    active
                      ? "bg-primary-container/10 text-primary-container font-medium"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-background"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-primary-container" />
                  )}
                  <item.icon size={18} className={active ? "text-primary-container" : "text-secondary"} />
                  {!collapsed && item.label}
                </a>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function ConsoleSidebar({
  userName,
  scope,
  isCommittee = false,
  isBphCommittee = false,
  isCoordinator = false,
  canCreateSurvey = false,
  canCreateEvent = false,
}: {
  userName: string;
  scope: "full" | string[] | null;
  isCommittee?: boolean;
  isBphCommittee?: boolean;
  isCoordinator?: boolean;
  canCreateSurvey?: boolean;
  canCreateEvent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Lipat = rail ikon saja di desktop. Pilihan diingat per browser supaya
  // admin tidak mengulang setiap pindah halaman.
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    // Bukan setState sinkron: disalurkan lewat rAF supaya tidak memicu
    // cascading render sebelum frame pertama selesai (aturan react-hooks).
    const raf = requestAnimationFrame(() => {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={`hidden md:flex shrink-0 bg-surface-container-lowest border-r border-outline-variant md:sticky md:top-0 md:h-screen flex-col ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className={`flex items-center px-4 py-5 border-b border-outline-variant ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
              <p className="text-body-sm text-on-surface-variant mt-1 truncate">{userName}</p>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            aria-label={collapsed ? "Buka sidebar" : "Lipat sidebar"}
            aria-expanded={!collapsed}
            className="grid h-10 w-10 place-items-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-background transition-colors"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <NavContent scope={scope} isCommittee={isCommittee} isBphCommittee={isBphCommittee} isCoordinator={isCoordinator} canCreateSurvey={canCreateSurvey} canCreateEvent={canCreateEvent} pathname={pathname} onNavigate={() => {}} collapsed={collapsed} />
        <Link
          href="/"
          title={collapsed ? "Kembali ke Situs" : undefined}
          className={`flex items-center gap-2 py-4 text-label-caps text-secondary hover:text-on-background border-t border-outline-variant transition-colors ${
            collapsed ? "justify-center px-0" : "px-6"
          }`}
        >
          <ArrowLeft size={14} />
          {!collapsed && "Kembali ke Situs"}
        </Link>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant px-4 py-3">
        <span className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</span>
        <button onClick={() => setOpen(true)} aria-label="Buka menu" aria-haspopup="dialog" className="-mr-2 grid h-11 w-11 place-items-center rounded-md text-on-background">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu konsol"
        >
          <aside
            className="w-64 h-full bg-surface-container-lowest border-r border-outline-variant flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-6 border-b border-outline-variant">
              <div className="min-w-0">
                <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
                <p className="text-body-sm text-on-surface-variant mt-1 truncate">{userName}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="-mr-2 grid h-11 w-11 place-items-center rounded-md text-secondary">
                <X size={22} />
              </button>
            </div>
            <NavContent scope={scope} isCommittee={isCommittee} isBphCommittee={isBphCommittee} isCoordinator={isCoordinator} canCreateSurvey={canCreateSurvey} canCreateEvent={canCreateEvent} pathname={pathname} onNavigate={() => setOpen(false)} />
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-6 py-4 text-label-caps text-secondary hover:text-on-background border-t border-outline-variant transition-colors"
            >
              <ArrowLeft size={14} /> Kembali ke Situs
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
