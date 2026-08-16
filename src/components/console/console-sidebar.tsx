"use client";

import { useState } from "react";
import {
  Menu,
  X,
  MessageSquare,
  LayoutDashboard,
  ArrowLeft,
  Users,
  Building2,
  CalendarDays,
  Package,
  FileBarChart,
  BookOpen,
  Images,
  UserPlus,
} from "lucide-react";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope-constants";
import Link from "next/link";

// `module: null` = always visible to anyone who got past the layout gate
// (Dashboard, Documentation are meta/support, not sensitive management).
// `module: "users"/"organization"/"feedback"` aren't delegable via
// adminModuleScope (no seed row lists them) - full tier only.
const NAV: { href: string; label: string; icon: typeof LayoutDashboard; module: AdminModule | null }[] = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard, module: null },
  { href: "/console/users", label: "Pengguna", icon: Users, module: "users" },
  { href: "/console/organization", label: "Organisasi", icon: Building2, module: "organization" },
  { href: "/console/events", label: "Kegiatan", icon: CalendarDays, module: "events" },
  { href: "/console/inventory", label: "Inventaris", icon: Package, module: "inventory" },
  { href: "/console/membership", label: "Pendaftaran", icon: UserPlus, module: "membership" },
  { href: "/console/content", label: "Konten", icon: Images, module: "content" },
  { href: "/console/reports", label: "Laporan", icon: FileBarChart, module: "reports" },
  { href: "/console/docs", label: "Dokumentasi", icon: BookOpen, module: null },
  { href: "/console/feedback", label: "Masukan Pengguna", icon: MessageSquare, module: "feedback" },
];

export function ConsoleSidebar({ userName, scope }: { userName: string; scope: "full" | string[] | null }) {
  const [open, setOpen] = useState(false);
  const visible = NAV.filter((item) => item.module === null || hasModuleAccess(scope, item.module));

  const links = (onNavigate: () => void) =>
    visible.map((item) => (
      <a
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-6 py-3 text-body-md text-on-background hover:bg-surface-container-low transition-colors"
      >
        <item.icon size={18} className="text-secondary" />
        {item.label}
      </a>
    ));

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden md:flex w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant min-h-screen flex-col">
        <div className="px-6 py-6 border-b border-outline-variant">
          <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
          <p className="text-label-caps text-on-surface-variant mt-1">{userName}</p>
        </div>
        <nav className="flex-1 py-4">{links(() => {})}</nav>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-4 text-label-caps text-secondary hover:text-on-background border-t border-outline-variant transition-colors"
        >
          <ArrowLeft size={14} /> Kembali ke Situs
        </Link>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant px-4 py-3">
        <span className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</span>
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="text-on-background">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <aside
            className="w-64 h-full bg-surface-container-lowest border-r border-outline-variant flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-6 border-b border-outline-variant">
              <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
              <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="text-secondary">
                <X size={22} />
              </button>
            </div>
            <nav className="flex-1 py-4">{links(() => setOpen(false))}</nav>
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
