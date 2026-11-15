"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

// Panel admin di bawah cermin halaman acara. Isinya dirender server lalu dioper sebagai
// JSX; di sini hanya berganti yang terlihat (`hidden`, bukan dilepas), supaya isian form
// yang belum disimpan tetap ada saat pindah bagian. Bagian aktif disimpan di ?bagian=
// lewat history.replaceState: tanpa perjalanan ke server, dan bisa dibagikan/di-refresh.

// Pengelompokan ala Google Form: tiap tab menjawab satu pertanyaan panitia
// ("acaranya seperti apa", "formulirnya bagaimana", "siapa yang daftar", ...).
export type EventPanelTab = "acara" | "formulir" | "pendaftar" | "panitia" | "pasca";

const TABS: { key: EventPanelTab; label: string }[] = [
  { key: "acara", label: "Acara" },
  { key: "formulir", label: "Formulir" },
  { key: "pendaftar", label: "Pendaftar" },
  { key: "panitia", label: "Panitia" },
  { key: "pasca", label: "Pasca-Acara" },
];

// Tautan lama (notifikasi, redirect, bookmark) masih memakai nama tab sebelumnya.
const LEGACY_TABS: Record<string, EventPanelTab> = { publik: "acara", internal: "pendaftar" };

const PANEL_ID = "event-admin-panel";

function tabFromUrl(value: string | null): EventPanelTab | null {
  if (!value) return null;
  if (TABS.some((tab) => tab.key === value)) return value as EventPanelTab;
  return LEGACY_TABS[value] ?? null;
}

function openTab(next: EventPanelTab) {
  const params = new URLSearchParams(window.location.search);
  params.set("bagian", next);
  window.history.replaceState(null, "", `?${params.toString()}`);
}

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
        openTab(tab);
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
  acara,
  formulir,
  pendaftar,
  panitia,
  pasca,
}: {
  defaultTab: EventPanelTab;
  /** Antrean yang menunggu keputusan per tab. Nol / tidak ada = tanpa angka. */
  pending: Partial<Record<EventPanelTab, number>>;
  acara: ReactNode;
  formulir: ReactNode;
  pendaftar: ReactNode;
  panitia: ReactNode;
  pasca: ReactNode;
}) {
  const fromUrl = tabFromUrl(useSearchParams().get("bagian"));
  // Dibekukan saat halaman dibuka: tahap acara bisa berubah karena aksi di panel ini sendiri
  // (mis. menerbitkan), dan tab tidak boleh melompat di tangan orang yang sedang memakainya.
  const [initialTab] = useState(defaultTab);
  const active = fromUrl ?? initialTab;
  const buttonsRef = useRef<Partial<Record<EventPanelTab, HTMLButtonElement | null>>>({});
  const content: Record<EventPanelTab, ReactNode> = { acara, formulir, pendaftar, panitia, pasca };

  // Pola tablist WAI-ARIA: panah berpindah tab, hanya tab aktif yang bisa dicapai dengan Tab.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((tab) => tab.key === active);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    openTab(TABS[next].key);
    buttonsRef.current[TABS[next].key]?.focus();
  }

  return (
    <section id={PANEL_ID} aria-labelledby={`${PANEL_ID}-heading`} className="mt-8 scroll-mt-6">
      <h2 id={`${PANEL_ID}-heading`} className="mb-3 text-headline-md text-on-background">
        Panel Admin
      </h2>
      <div
        role="tablist"
        aria-label="Bagian panel admin"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-outline-variant"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => {
              buttonsRef.current[tab.key] = el;
            }}
            id={`${PANEL_ID}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`${PANEL_ID}-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            onClick={() => openTab(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors ${
              active === tab.key
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {tab.label}
            {(pending[tab.key] ?? 0) > 0 && (
              <span className="ml-2 rounded bg-gold-ink/15 px-1.5 py-0.5 tabular-nums text-gold-ink">
                {pending[tab.key]}
                <span className="sr-only"> menunggu keputusan</span>
              </span>
            )}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <div
          key={tab.key}
          id={`${PANEL_ID}-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`${PANEL_ID}-tab-${tab.key}`}
          hidden={active !== tab.key}
          className="pt-4"
        >
          {content[tab.key]}
        </div>
      ))}
    </section>
  );
}
