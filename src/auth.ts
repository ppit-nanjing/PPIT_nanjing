import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, roles, departmentMembers, departments } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

// Best-effort brute-force throttle for the email/password path. NOTE: this is an
// in-memory Map per function instance, so on Vercel (multiple Lambda instances)
// it does not provide a hard guarantee across requests that land on different
// instances - it adds friction, not bulletproof rate-limiting. Real protection
// needs a shared store (e.g. Upstash Redis), which isn't provisioned yet.
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; lockUntil: number }>();

function checkThrottle(key: string): { locked: boolean; retryAfterMs: number } {
  const rec = attempts.get(key);
  if (!rec) return { locked: false, retryAfterMs: 0 };
  if (rec.lockUntil > Date.now()) return { locked: true, retryAfterMs: rec.lockUntil - Date.now() };
  return { locked: false, retryAfterMs: 0 };
}

function registerFailure(key: string) {
  const rec = attempts.get(key) ?? { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.lockUntil = Date.now() + LOCK_MS;
  attempts.set(key, rec);
}

function registerSuccess(key: string) {
  attempts.delete(key);
}

// Admin-access rule per docs/Data Dictionary.md "Admin Access Rule" (sourced from the
// 2026/2027 recruitment guidebook):
// - accessTier 'full' (Ketua Umum, BPH, any Koordinator Divisi) -> every admin module.
// - belongs to a department with grantsFullAdminAccess = true (every member of Divisi
//   Teknologi, coordinator or not - they build/maintain the system) -> every module too.
// - accessTier 'scoped' (Anggota Divisi) -> only the module keys listed in the union of
//   their department(s)' adminModuleScope arrays.
// - accessTier 'advisory' (Dewan Pembina) or no role/department -> no admin access.
async function resolveAdminScope(userId: string): Promise<"full" | string[] | null> {
  const [user] = await db
    .select({ accessTier: roles.accessTier })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  const memberships = await db
    .select({ grantsFullAdminAccess: departments.grantsFullAdminAccess, adminModuleScope: departments.adminModuleScope })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));

  if (user?.accessTier === "full" || memberships.some((m) => m.grantsFullAdminAccess)) return "full";
  if (user?.accessTier !== "scoped") return null;

  const scope = [...new Set(memberships.flatMap((m) => m.adminModuleScope))];
  return scope;
}

async function resolveEmailSubscribed(userId: string): Promise<boolean | null> {
  const [user] = await db.select({ emailSubscribed: users.emailSubscribed }).from(users).where(eq(users.id, userId));
  return user?.emailSubscribed ?? null;
}

// Same shape as resolveEmailSubscribed - resolved fresh per session() call
// rather than baked into the JWT at sign-in, so it stays simple. This value
// is only a fallback for a device with no NEXT_LOCALE cookie yet; see the
// cookie-wins-over-session note in src/lib/i18n/server.ts.
async function resolveLocale(userId: string): Promise<string | null> {
  const [user] = await db.select({ locale: users.locale }).from(users).where(eq(users.id, userId));
  return user?.locale ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // DrizzleAdapter's second arg is required whenever the table names/columns
  // don't match its own defaults (singular "user"/"account"/"session" and
  // camelCase "verificationToken") - without it, it silently queries tables
  // that don't exist (users/accounts/sessions/verification_tokens here) and
  // Postgres throws 42P01 undefined_table on first sign-in.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google,
    Credentials({
      // Shown only on the Auth.js default sign-in page (we use a custom /login,
      // so these labels are informational), but the field names MUST match what
      // the credentials sign-in server action passes to signIn("credentials").
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const { locked, retryAfterMs } = checkThrottle(email);
        if (locked) {
          // Delay to slow automated guessing even within a single instance window.
          await new Promise((r) => setTimeout(r, Math.min(retryAfterMs, 1000)));
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.email, email));
        // No account, or a Google-OAuth-only account (no passwordHash) - reject.
        // We return null for both so the response is identical (no email-enumeration
        // leak about whether an address is registered or Google-linked).
        if (!user || !user.passwordHash) {
          registerFailure(email);
          return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          registerFailure(email);
          return null;
        }

        registerSuccess(email);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  // JWT sessions, not "database": @auth/core's Credentials branch
  // (callback/index.js) always JWT-encodes the session cookie and never writes a
  // row to the sessions table, so database sessions cannot persist a credentials
  // login. JWT is the supported strategy for a Credentials + OAuth mix.
  session: { strategy: "jwt" },
  callbacks: {
    // Handles admin-invited accounts: a `users` row may exist with status
    // "invited" and no passwordHash when an admin pre-provisioned an account for
    // someone before they ever signed in. Auth.js does NOT auto-link an OAuth
    // sign-in to an
    // existing user by email (by design, to prevent account takeover via a
    // same-email OAuth provider) - without this, the invited person's first
    // Google sign-in would hit OAuthAccountNotLinked and fail. We manually link
    // the `accounts` row here, which runs BEFORE the adapter's own
    // getUserByAccount check in handleLoginOrRegister, so that check finds our
    // row and treats it as an existing linked account instead of throwing.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const email = user.email.toLowerCase();
        const [existing] = await db.select().from(users).where(eq(users.email, email));
        if (existing?.status === "invited") {
          const [alreadyLinked] = await db
            .select()
            .from(accounts)
            .where(and(eq(accounts.provider, "google"), eq(accounts.providerAccountId, account.providerAccountId)));
          if (!alreadyLinked) {
            await db.insert(accounts).values({
              userId: existing.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: (account.refresh_token as string | null) ?? null,
              access_token: (account.access_token as string | null) ?? null,
              expires_at: (account.expires_at as number | null) ?? null,
              token_type: (account.token_type as string | null) ?? null,
              scope: (account.scope as string | null) ?? null,
              id_token: (account.id_token as string | null) ?? null,
              session_state: (account.session_state as string | null) ?? null,
            });
            await db.update(users).set({ status: "active" }).where(eq(users.id, existing.id));
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Bake the stable user id into the token at sign-in (user is present only
      // then); on later refreshes we keep the existing token.id.
      if (user?.id) {
        token.id = user.id;
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      }
      return token;
    },
    async session({ session, token }) {
      const userId = (token.id as string) ?? (token.sub as string);
      session.user.id = userId;
      const scope = await resolveAdminScope(userId);
      session.user.adminScope = scope;
      session.user.isAdmin = scope === "full" || (Array.isArray(scope) && scope.length > 0);
      session.user.emailSubscribed = await resolveEmailSubscribed(userId);
      session.user.locale = await resolveLocale(userId);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
