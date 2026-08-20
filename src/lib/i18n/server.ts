// No "server-only" import - that package isn't a dependency here (i18n spec:
// no new dependencies). next/headers already throws if this module is ever
// pulled into a client bundle, which gives the same protection.
import { cookies, headers } from "next/headers";
import { auth } from "@/auth";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { DICTIONARIES, makeT } from "./translate";

// Cookie wins over the JWT session on purpose. Sessions here are JWT, not
// database-backed (see src/auth.ts), so a session token can't be rewritten
// from a plain server action - setLocale() can only write the cookie + DB
// row, not the token itself. If session were checked first, changing
// language would silently do nothing until the token happened to refresh.
// Cookie-first means both cases just work: a new device with no cookie yet
// falls through to the session's saved value, and changing language writes
// the cookie immediately so the very next render sees it.
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const session = await auth();
  const fromSession = session?.user?.locale;
  if (isLocale(fromSession)) return fromSession;

  const h = await headers();
  const acceptLanguage = h.get("accept-language") ?? "";
  if (/^en\b/i.test(acceptLanguage.split(",")[0]?.trim() ?? "")) return "en";

  return DEFAULT_LOCALE;
}

// Call once per render (e.g. in the root layout) and pass locale/dict down
// via props or <LocaleProvider> - calling this repeatedly on one page means
// repeated auth() checks for no benefit.
export async function getT() {
  const locale = await getLocale();
  return { locale, t: makeT(DICTIONARIES[locale]), dict: DICTIONARIES[locale] };
}
