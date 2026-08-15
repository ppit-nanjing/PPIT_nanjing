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
    } & DefaultSession["user"];
  }
}
