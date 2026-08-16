"use client";

import { UserCog, Network } from "lucide-react";

export function UsersTabs({
  active,
  onTab,
}: {
  active: "list" | "structure";
  onTab: (t: "list" | "structure") => void;
}) {
  const base =
    "flex items-center gap-2 px-4 py-2 text-label-caps uppercase tracking-wide rounded-md transition-colors";
  return (
    <div className="flex gap-2 mb-8">
      <button
        type="button"
        onClick={() => onTab("list")}
        className={`${base} ${active === "list" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
      >
        <UserCog size={16} /> Daftar Pengguna
      </button>
      <button
        type="button"
        onClick={() => onTab("structure")}
        className={`${base} ${active === "structure" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
      >
        <Network size={16} /> Struktur Organisasi
      </button>
    </div>
  );
}
