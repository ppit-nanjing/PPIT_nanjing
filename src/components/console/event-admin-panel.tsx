"use client";

import type { ReactNode } from "react";
import { ConsoleTabPanel, openConsoleTab } from "@/components/console/console-tab-panel";

// Panel admin di bawah cermin halaman acara (tab generiknya: ConsoleTabPanel).
// Pengelompokan ala Google Form: tiap tab menjawab satu pertanyaan panitia
// ("acaranya seperti apa", "formulirnya bagaimana", "siapa yang daftar", ...).
export type EventPanelTab = "acara" | "formulir" | "pendaftar" | "panitia" | "pasca";

const LABELS: Record<EventPanelTab, string> = {
  acara: "Acara",
  formulir: "Formulir",
  pendaftar: "Pendaftar",
  panitia: "Panitia",
  pasca: "Pasca-Acara",
};

// Tautan lama (notifikasi, redirect, bookmark) masih memakai nama tab sebelumnya.
const LEGACY_TABS: Record<string, EventPanelTab> = { publik: "acara", internal: "pendaftar" };

const PANEL_ID = "event-admin-panel";

/** Tombol di luar panel (antrean di ringkasan acara) yang membuka satu bagian panel. */
export function EventPanelJump({
  tab,
  className,
  children,
}: {
  tab: EventPanelTab;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        openConsoleTab(tab);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById(PANEL_ID)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }}
    >
      {children}
    </button>
  );
}

export function EventAdminPanel({
  defaultTab,
  pending,
  ...content
}: {
  defaultTab: EventPanelTab;
  /** Antrean yang menunggu keputusan per tab. Nol / tidak ada = tanpa angka. */
  pending: Partial<Record<EventPanelTab, number>>;
} & Record<EventPanelTab, ReactNode>) {
  return (
    <ConsoleTabPanel
      id={PANEL_ID}
      heading="Panel Admin"
      ariaLabel="Bagian panel admin"
      className="mt-8"
      defaultTab={defaultTab}
      legacyKeys={LEGACY_TABS}
      tabs={(Object.keys(LABELS) as EventPanelTab[]).map((key) => ({
        key,
        label: LABELS[key],
        content: content[key],
        pending: pending[key],
      }))}
    />
  );
}
