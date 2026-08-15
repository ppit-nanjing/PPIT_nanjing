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
} from "lucide-react";

// Every module from docs/Information Architecture.md § Admin Console now has
// a /console/* page - Documentation & Help Center was the last one built.
const NAV = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/users", label: "Pengguna", icon: Users },
  { href: "/console/organization", label: "Organisasi", icon: Building2 },
  { href: "/console/events", label: "Kegiatan", icon: CalendarDays },
  { href: "/console/inventory", label: "Inventaris", icon: Package },
  { href: "/console/reports", label: "Laporan", icon: FileBarChart },
  { href: "/console/docs", label: "Dokumentasi", icon: BookOpen },
  { href: "/console/feedback", label: "Masukan Pengguna", icon: MessageSquare },
];

export function ConsoleSidebar({ userName }: { userName: string }) {
  return (
    <aside className="w-64 shrink-0 bg-surface-container-lowest border-r border-outline-variant min-h-screen flex flex-col">
      <div className="px-6 py-6 border-b border-outline-variant">
        <p className="text-headline-md font-bold text-primary uppercase tracking-tight">Console</p>
        <p className="text-label-caps text-on-surface-variant mt-1">{userName}</p>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map((item) => (
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
