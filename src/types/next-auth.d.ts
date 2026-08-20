import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      // "full" = every admin module. string[] = only these module keys (may be
      // empty, meaning accessTier is 'scoped' but no department grants any
      // module - counts as no access). null = no admin access at all
      // (accessTier 'advisory', or no role/department assigned).
      adminScope: "full" | string[] | null;
      emailSubscribed: boolean | null;
      // Saved language preference, resolved fresh per session() callback call
      // (see resolveLocale() in src/auth.ts). Not the source of truth for
      // rendering - src/lib/i18n/server.ts's getLocale() prefers the
      // NEXT_LOCALE cookie over this, and only falls back to it for a
      // logged-in user on a device/browser that has no cookie yet.
      locale: string | null;
    } & DefaultSession["user"];
  }
}
