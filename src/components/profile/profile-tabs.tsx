"use client";

import { useEffect, useState, type ReactNode } from "react";

export type ProfileTab = {
  id: string;
  label: string;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
  /** Optional counter shown as a small pill on the tab (e.g. active borrows). */
  badge?: number;
  content: ReactNode;
};

// Tab switcher for /profile - keeps each section server-rendered; only which
// panel is visible is client state. Deep-linkable via hash (/profile#peminjaman)
// so in-page links like the hero "Edit Profil" button can point at a tab.
export function ProfileTabs({ tabs, ariaLabel }: { tabs: ProfileTab[]; ariaLabel: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.some((tab) => tab.id === hash)) setActive(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [tabs]);

  const select = (id: string) => {
    setActive(id);
    if (window.location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 mb-6 -mx-1 px-1"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`profile-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`profile-panel-${tab.id}`}
              onClick={() => select(tab.id)}
              className={`flex items-center gap-1.5 shrink-0 whitespace-nowrap text-label-caps uppercase tracking-wide px-3.5 sm:px-4 py-2.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                selected
                  ? "bg-primary-container text-on-primary border-primary-container shadow-sm"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-background"
              }`}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span
                  className={`text-label-caps px-1.5 py-0.5 rounded-full leading-none ${
                    selected ? "bg-on-primary/20 text-on-primary" : "bg-primary-container/10 text-primary-container"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) =>
        tab.id === active ? (
          <div key={tab.id} role="tabpanel" id={`profile-panel-${tab.id}`} aria-labelledby={`profile-tab-${tab.id}`}>
            {tab.content}
          </div>
        ) : null,
      )}
    </div>
  );
}
