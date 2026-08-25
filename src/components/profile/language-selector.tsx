"use client";

import { Check } from "lucide-react";
import { useT, useLocale, useLocaleSwitch } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n/config";

// Full picker for the "official" saved preference (writes users.locale, see
// setLocale() in src/app/actions/locale.ts). The nav quick-toggle
// (src/components/site-nav.tsx LanguageToggle) does the same switch for
// visitors who don't want to open /profile - both share the animated
// transition via useLocaleSwitch(), implemented once in src/lib/i18n/client.tsx.
export function LanguageSelector() {
  const t = useT();
  const locale = useLocale();
  const { switching, switchLocale } = useLocaleSwitch();

  return (
    <div className="flex flex-col gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-5">
      <div>
        <span className="text-body-md font-medium text-on-background">{t("settings.language.label")}</span>
        <p className="text-label-caps text-on-surface-variant mt-1">{t("settings.language.help")}</p>
      </div>
      <div role="radiogroup" aria-label={t("settings.language.label")} className="flex flex-wrap gap-2">
        {LOCALES.map((l) => {
          const selected = l === locale;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={switching}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                switchLocale(l, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
              }}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ${
                selected
                  ? "border-primary-container bg-primary-container/15 text-on-background"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="text-body-sm">{LOCALE_LABEL[l]}</span>
              {/* Selection conveyed by more than colour alone. */}
              {selected && <Check size={14} className="opacity-70 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="text-label-caps text-on-surface-variant">{t("settings.language.contentNotice")}</p>
    </div>
  );
}
