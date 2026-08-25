"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Each theme is a palette named after something that actually identifies Nanjing,
// so the site reads as this city and not as a generic chapter template. The
// palettes themselves live in globals.css - this only flips data-theme.
export const CITY_THEMES = [
  { id: "zijin", label: "Zijin", hanzi: "紫金山", noteKey: "theme.note.zijin", swatch: "#4a3b78" },
  { id: "meihua", label: "Meihua", hanzi: "梅花", noteKey: "theme.note.meihua", swatch: "#8e2b41" },
  { id: "mingwall", label: "Ming", hanzi: "明城墙", noteKey: "theme.note.mingwall", swatch: "#3f4e5e" },
] as const satisfies readonly { id: string; label: string; hanzi: string; noteKey: TKey; swatch: string }[];

export type CityThemeId = (typeof CITY_THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "ppit-city-theme";
export const MODE_STORAGE_KEY = "ppit-color-mode";
const DEFAULT_THEME: CityThemeId = "zijin";

// "system" is a stored *absence* of preference: the attribute still gets an
// explicit light/dark value so the CSS never needs a duplicate @media block.
type ColorMode = "light" | "dark" | "system";
const MODES: { id: ColorMode; labelKey: TKey; Icon: typeof Sun }[] = [
  { id: "light", labelKey: "theme.light", Icon: Sun },
  { id: "dark", labelKey: "theme.dark", Icon: Moon },
  { id: "system", labelKey: "theme.system", Icon: Monitor },
];

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function applyMode(mode: ColorMode) {
  document.documentElement.dataset.mode =
    mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

function apply(id: CityThemeId) {
  // The default palette lives on bare :root, so it must not carry an attribute.
  if (id === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
}

export function ThemeSwitcher() {
  const t = useT();
  const [active, setActive] = useState<CityThemeId>(DEFAULT_THEME);
  const [mode, setMode] = useState<ColorMode>("system");

  // Read once on mount rather than during render: the server has no access to
  // localStorage, so touching it while rendering would desync hydration.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as CityThemeId | null;
    if (stored && CITY_THEMES.some((t) => t.id === stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only storage read
      setActive(stored);
    }
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ColorMode | null;
    if (storedMode === "light" || storedMode === "dark") setMode(storedMode);
  }, []);

  // While on "system", follow the OS if it flips mid-session.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function chooseMode(next: ColorMode) {
    setMode(next);
    applyMode(next);
    if (next === "system") localStorage.removeItem(MODE_STORAGE_KEY);
    else localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  function choose(id: CityThemeId) {
    setActive(id);
    apply(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-caps uppercase tracking-wide opacity-70">{t("theme.cityTheme")}</span>
      <div role="radiogroup" aria-label={t("theme.cityThemeAria")} className="flex flex-wrap gap-2">
        {CITY_THEMES.map((ct) => {
          const selected = ct.id === active;
          return (
            <button
              key={ct.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(ct.id)}
              title={`${ct.hanzi} — ${t(ct.noteKey)}`}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                selected ? "border-current bg-current/15" : "border-current/30 hover:bg-current/10"
              }`}
            >
              <span
                aria-hidden
                className="h-4 w-4 rounded-full border border-current/30"
                style={{ background: ct.swatch }}
              />
              <span className="text-body-sm">{ct.hanzi}</span>
              {/* Selection is conveyed by more than colour alone. */}
              {selected && <Check size={14} className="opacity-70 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>

      <span className="text-label-caps uppercase tracking-wide opacity-70 mt-3">{t("theme.appearance")}</span>
      <div role="radiogroup" aria-label={t("theme.appearanceAria")} className="flex flex-wrap gap-2">
        {MODES.map(({ id, labelKey, Icon }) => {
          const selected = id === mode;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => chooseMode(id)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                selected ? "border-current bg-current/15" : "border-current/30 hover:bg-current/10"
              }`}
            >
              <Icon size={14} aria-hidden />
              <span className="text-body-sm">{t(labelKey)}</span>
              {selected && <Check size={14} className="opacity-70 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
