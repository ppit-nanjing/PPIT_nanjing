import {
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
} from "lucide-react";
import { hasModuleAccess, type AdminModule } from "@/lib/admin-scope";

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
  { href: "/console/content", label: "Konten", icon: Images, module: "content" },
  { href: "/console/reports", label: "Laporan", icon: FileBarChart, module: "reports" },
  { href: "/console/docs", label: "Dokumentasi", icon: BookOpen, module: null },
  { href: "/console/feedback", label: "Masukan Pengguna", icon: MessageSquare, module: "feedback" },
];

export function ConsoleSidebar({ userName, scope }: { userName: string; scope: "full" | string[] | null }) {
  const visible = NAV.filter((item) => item.module === null || hasModuleAccess(scope, item.module));

  return (
    <aside className="w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-outline-variant">
        <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
        <p className="text-label-caps text-on-surface-variant mt-1">{userName}</p>
      </div>
      <nav className="flex-1 py-4">
        {visible.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-6 py-3 text-body-md text-on-background hover:bg-surface-container-low transition-colors"
          >
            <item.icon size={18} className="text-secondary" />
            {item.label}
          </a>
        ))}
      </nav>
      <a
        href="/"
        className="flex items-center gap-2 px-6 py-4 text-label-caps text-secondary hover:text-on-background border-t border-outline-variant transition-colors"
      >
        <ArrowLeft size={14} /> Kembali ke Situs
      </a>
    </aside>
  );
}
