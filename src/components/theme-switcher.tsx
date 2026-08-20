"use client";

import { useEffect, useState } from "react";

// Each theme is a palette named after something that actually identifies Nanjing,
// so the site reads as this city and not as a generic chapter template. The
// palettes themselves live in globals.css - this only flips data-theme.
export const CITY_THEMES = [
  { id: "zijin", label: "Zijin", hanzi: "紫金山", note: "Gunung Ungu-Emas", swatch: "#4a3b78" },
  { id: "meihua", label: "Meihua", hanzi: "梅花", note: "Bunga prem, bunga kota", swatch: "#8e2b41" },
  { id: "mingwall", label: "Ming", hanzi: "明城墙", note: "Tembok kota Ming", swatch: "#3f4e5e" },
] as const;

export type CityThemeId = (typeof CITY_THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "ppit-city-theme";
const DEFAULT_THEME: CityThemeId = "zijin";

function apply(id: CityThemeId) {
  // The default palette lives on bare :root, so it must not carry an attribute.
  if (id === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
}

export function ThemeSwitcher() {
  const [active, setActive] = useState<CityThemeId>(DEFAULT_THEME);

  // Read once on mount rather than during render: the server has no access to
  // localStorage, so touching it while rendering would desync hydration.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as CityThemeId | null;
    if (stored && CITY_THEMES.some((t) => t.id === stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage read
      setActive(stored);
    }
  }, []);

  function choose(id: CityThemeId) {
    setActive(id);
    apply(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tema Kota</span>
      <div role="radiogroup" aria-label="Pilih tema kota" className="flex flex-wrap gap-2">
        {CITY_THEMES.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(t.id)}
              title={`${t.hanzi} — ${t.note}`}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selected
                  ? "border-primary-container bg-surface-container-high"
                  : "border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              <span
                aria-hidden
                className="h-4 w-4 rounded-full border border-outline-variant"
                style={{ background: t.swatch }}
              />
              <span className="text-body-sm text-on-background">{t.hanzi}</span>
              {/* Selection is conveyed by more than colour alone. */}
              {selected && <span className="text-label-caps text-on-surface-variant">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
