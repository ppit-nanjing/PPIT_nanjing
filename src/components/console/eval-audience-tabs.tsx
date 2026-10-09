"use client";

import { useState, type ReactNode } from "react";
import { ClipboardCheck, ClipboardList } from "lucide-react";

// Switcher dua audiens evaluasi (Peserta | Panitia) untuk section konsol.
// Children diisi dari server component — di sini hanya menyimpan tab aktif,
// kontennya tetap dirender server (pola CollapsibleSection/Tabs yang ada).
export function EvalAudienceTabs({
  peserta,
  panitia,
  pesertaLabel = "Peserta",
  panitiaLabel = "Panitia",
  initial = "peserta",
}: {
  peserta: ReactNode;
  panitia: ReactNode;
  pesertaLabel?: string;
  panitiaLabel?: string;
  initial?: "peserta" | "panitia";
}) {
  const [active, setActive] = useState<"peserta" | "panitia">(initial);

  const tabClass = (isActive: boolean) =>
    `inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-label-caps uppercase tracking-wide transition-colors ${
      isActive ? "bg-primary-container text-on-primary" : "text-on-surface-variant hover:text-on-background"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-outline-variant bg-surface-container-low p-1 w-fit" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={active === "peserta"}
          onClick={() => setActive("peserta")}
          className={tabClass(active === "peserta")}
        >
          <ClipboardList size={14} aria-hidden="true" /> {pesertaLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === "panitia"}
          onClick={() => setActive("panitia")}
          className={tabClass(active === "panitia")}
        >
          <ClipboardCheck size={14} aria-hidden="true" /> {panitiaLabel}
        </button>
      </div>
      {active === "peserta" ? peserta : panitia}
    </div>
  );
}
