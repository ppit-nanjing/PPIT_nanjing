export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

// Deliberately NOT part of the dictionary - a language's own name must never
// change when you switch locale (English never becomes "Inggris" just
// because the active locale is id), so it can't be a translatable key.
export const LOCALE_LABEL: Record<Locale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  id: "ID",
  en: "EN",
};

// BCP-47 tags for Intl.* - kept separate from our internal locale code so
// "en" can map to en-GB (DD/MM dates, the convention used here) without
// touching the internal code.
export const INTL_LOCALE: Record<Locale, string> = {
  id: "id-ID",
  en: "en-GB",
};

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "id" ? "en" : "id";
}
