"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

// Panel bertab konsol (Panel Admin acara, Manajemen Inventaris). Isinya dirender server
// lalu dioper sebagai JSX; di sini hanya berganti yang terlihat (`hidden`, bukan dilepas),
// supaya isian form yang belum disimpan tetap ada saat pindah bagian. Bagian aktif
// disimpan di ?bagian= lewat history.replaceState: tanpa perjalanan ke server, dan bisa
// dibagikan/di-refresh.

export type ConsoleTab<K extends string> = {
  key: K;
  label: string;
  content: ReactNode;
  /** Antrean yang menunggu keputusan. Nol / tidak ada = tanpa angka. */
  pending?: number;
};

/** Pindah bagian dari luar panel (mis. tombol antrean di ringkasan). */
export function openConsoleTab(key: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("bagian", key);
  window.history.replaceState(null, "", `?${params.toString()}`);
}

export function ConsoleTabPanel<K extends string>({
  id,
  heading,
  ariaLabel,
  tabs,
  defaultTab,
  legacyKeys = {},
  className = "",
}: {
  id: string;
  /** Judul di atas tab. Kosong = tanpa judul (ariaLabel dipakai untuk tablist). */
  heading?: string;
  ariaLabel: string;
  tabs: ConsoleTab<K>[];
  defaultTab: K;
  /** Nama bagian lama di tautan (notifikasi, bookmark) → bagian sekarang. */
  legacyKeys?: Record<string, K>;
  className?: string;
}) {
  const raw = useSearchParams().get("bagian");
  const fromUrl = raw && tabs.some((tab) => tab.key === raw) ? (raw as K) : raw ? (legacyKeys[raw] ?? null) : null;
  // Dibekukan saat halaman dibuka: aksi di panel bisa mengubah bagian bawaan (mis. antrean
  // habis), dan tab tidak boleh melompat di tangan orang yang sedang memakainya.
  const [initialTab] = useState(defaultTab);
  const active = fromUrl ?? initialTab;
  const buttonsRef = useRef<Partial<Record<K, HTMLButtonElement | null>>>({});

  // Pola tablist WAI-ARIA: panah berpindah tab, hanya tab aktif yang bisa dicapai dengan Tab.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.key === active);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    openConsoleTab(tabs[next].key);
    buttonsRef.current[tabs[next].key]?.focus();
  }

  return (
    <section id={id} aria-labelledby={heading ? `${id}-heading` : undefined} aria-label={heading ? undefined : ariaLabel} className={`scroll-mt-6 ${className}`}>
      {heading && (
        <h2 id={`${id}-heading`} className="mb-3 text-headline-md text-on-background">
          {heading}
        </h2>
      )}
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-outline-variant"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => {
              buttonsRef.current[tab.key] = el;
            }}
            id={`${id}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={`${id}-${tab.key}`}
            tabIndex={active === tab.key ? 0 : -1}
            onClick={() => openConsoleTab(tab.key)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors ${
              active === tab.key
                ? "border-primary-container text-primary-container"
                : "border-transparent text-on-surface-variant hover:text-on-background"
            }`}
          >
            {tab.label}
            {(tab.pending ?? 0) > 0 && (
              <span className="ml-2 rounded bg-gold-ink/15 px-1.5 py-0.5 tabular-nums text-gold-ink">
                {tab.pending}
                <span className="sr-only"> menunggu keputusan</span>
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${id}-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={active !== tab.key}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </section>
  );
}
