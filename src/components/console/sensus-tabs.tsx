"use client";

import { useState, type ReactNode } from "react";
import { List, BarChart3 } from "lucide-react";

// Toggles between the existing filterable list and the new per-question
// analytics view without moving either one's markup into a client
// component: both are rendered server-side and passed in as already-built
// JSX, and this just switches which one stays visible (`hidden`, not
// unmounting - filter state inside "daftar" survives a tab switch).
export function SensusTabs({ daftar, analitik }: { daftar: ReactNode; analitik: ReactNode }) {
  const [tab, setTab] = useState<"daftar" | "analitik">("daftar");
  const base = "flex items-center gap-2 px-4 py-2 text-label-caps uppercase tracking-wide rounded-md transition-colors";

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("daftar")}
          className={`${base} ${tab === "daftar" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
        >
          <List size={16} /> Daftar
        </button>
        <button
          type="button"
          onClick={() => setTab("analitik")}
          className={`${base} ${tab === "analitik" ? "bg-surface-container-low text-on-background" : "text-on-surface-variant hover:text-on-background"}`}
        >
          <BarChart3 size={16} /> Analitik
        </button>
      </div>

      <div hidden={tab !== "daftar"}>{daftar}</div>
      <div hidden={tab !== "analitik"}>{analitik}</div>
    </div>
  );
}
