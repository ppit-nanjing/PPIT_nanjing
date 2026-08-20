import { id } from "./dictionaries/id";
import { en } from "./dictionaries/en";
import type { Dictionary, TKey } from "./dictionaries/id";
import type { Locale } from "./config";

export const DICTIONARIES: Record<Locale, Dictionary> = { id, en };

export type T = (key: TKey, vars?: Record<string, string | number>) => string;

// Isomorphic (no "use client"/"use server") - called from src/lib/i18n/server.ts
// on the server and from src/lib/i18n/client.tsx on the client, always with an
// already-resolved dictionary, never crossing the RSC boundary itself.
export function makeT(dict: Dictionary): T {
  return (key, vars) => {
    // Falls back to Indonesian, then to the raw key. Deliberately not a blank
    // string - a visible raw key in the UI is a bug you notice; an empty
    // string is a bug that hides.
    const raw = dict[key] ?? id[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
