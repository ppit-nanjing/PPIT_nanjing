import { MessageSquare, LayoutDashboard, ArrowLeft } from "lucide-react";

// Only Feedback is wired up so far - the rest of the admin modules documented in
// docs/Information Architecture.md § Admin Console still need their own /console/*
// pages (Users, Organization, Events, Inventory, Reports, Documentation).
const NAV = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
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
