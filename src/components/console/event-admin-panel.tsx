"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

// Panel admin di bawah cermin halaman acara. Isinya dirender server lalu dioper sebagai
// JSX; di sini hanya berganti yang terlihat (`hidden`, bukan dilepas), supaya isian form
// yang belum disimpan tetap ada saat pindah bagian. Bagian aktif disimpan di ?bagian=
// lewat history.replaceState: tanpa perjalanan ke server, dan bisa dibagikan/di-refresh.

export type EventPanelTab = "publik" | "internal" | "pasca";

const TABS: { key: EventPanelTab; label: string }[] = [
  { key: "publik", label: "Publik" },
  { key: "internal", label: "Internal" },
  { key: "pasca", label: "Pasca-Acara" },
];

const PANEL_ID = "event-admin-panel";

function isPanelTab(value: string | null): value is EventPanelTab {
  return TABS.some((tab) => tab.key === value);
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
  pendingInternal,
  publik,
  internal,
  pasca,
}: {
  defaultTab: EventPanelTab;
  /** Antrean yang menunggu keputusan di bagian Internal. Nol = tanpa angka. */
  pendingInternal: number;
  publik: ReactNode;
  internal: ReactNode;
  pasca: ReactNode;
}) {
  const fromUrl = useSearchParams().get("bagian");
  // Dibekukan saat halaman dibuka: tahap acara bisa berubah karena aksi di panel ini sendiri
  // (mis. menerbitkan), dan tab tidak boleh melompat di tangan orang yang sedang memakainya.
  const [initialTab] = useState(defaultTab);
  const active = isPanelTab(fromUrl) ? fromUrl : initialTab;
  const buttonsRef = useRef<Partial<Record<EventPanelTab, HTMLButtonElement | null>>>({});
  const content: Record<EventPanelTab, ReactNode> = { publik, internal, pasca };

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
            {tab.key === "internal" && pendingInternal > 0 && (
              <span className="ml-2 rounded bg-gold-ink/15 px-1.5 py-0.5 tabular-nums text-gold-ink">
                {pendingInternal}
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
