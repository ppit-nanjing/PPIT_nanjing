import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      emailSubscribed: boolean | null;
    } & DefaultSession["user"];
  }
}
