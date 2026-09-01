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

/**
 * Read the /api/upload response and return the stored URL, or throw a
 * localized Error.
 *
 * The response body is not always our JSON envelope: Vercel's ~4.5 MB request
 * ceiling replies 413 with no body, a crashed function replies with an HTML
 * error page, an edge timeout replies empty. Calling `res.json()` directly on
 * any of those throws "Unexpected end of JSON input" and buries the real
 * problem - so parse defensively and map by status.
 */
export async function readUploadResult(res: Response, t: T): Promise<string> {
  const raw = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // non-JSON error body - handled below by status
  }

  if (!res.ok) {
    const hasEnvelope = !!data && typeof data === "object" && "errorKey" in data;
    if (hasEnvelope) throw new Error(uploadErrorMessage(t, data));
    if (res.status === 413) throw new Error(t("upload.errTooLarge", { mb: 4 }));
    throw new Error(t("upload.errServer"));
  }

  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error(t("upload.errServer"));
  return url;
}
