import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";

/**
 * /api/upload answers failures with `{ errorKey, vars? }` instead of a finished
 * sentence - the route runs before any locale is resolved for the response, so
 * the caller (always a client component, always inside <LocaleProvider>) is the
 * only place that knows which language to render it in.
 *
 * Falls back to the generic key rather than showing the raw envelope if a
 * future route ever answers with something unexpected.
 */
export function uploadErrorMessage(t: T, data: unknown): string {
  const d = data as { errorKey?: string; vars?: Record<string, string | number> } | null;
  return d?.errorKey ? t(d.errorKey as TKey, d.vars) : t("upload.errFailed");
}
