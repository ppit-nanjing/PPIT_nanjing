"use server";

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LOGIN_REMEMBER_COOKIE, signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import { safeRedirect } from "@/lib/safe-redirect";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Carries a dictionary KEY, not a finished sentence: this runs on the server
// where the request locale is known but the dictionary is not the natural
// place to reach for, and <CredentialForm> already has useT() to render it.
export type AuthFormState = { errorKey?: TKey; vars?: Record<string, string | number> };

// Minimal, non-pedantic email shape check - enough to reject obvious junk
// without inventing a strict RFC validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function deriveName(email: string): string {
  const local = email.split("@")[0] || "Anggota";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const pretty = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  return pretty || "Anggota PPIT";
}

// Email/password sign-UP: create a local account, then auto sign-in.
export async function signUpWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) return { errorKey: "auth.errEmailInvalid" };
  if (password.length < MIN_PASSWORD) return { errorKey: "auth.errPasswordShort", vars: { n: MIN_PASSWORD } };
  if (password !== confirm) return { errorKey: "auth.errConfirmMismatch" };

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.email, email));

  // Respect the existing unique(email) constraint rather than creating a
  // second row:
  //  - an invited account (no passwordHash yet, status "invited") is CLAIMED:
  //    set its passwordHash + flip to active on the same row so the person who
  //    was invited can sign in with a password they choose.
  //  - an existing Google-OAuth-only account (no passwordHash, already active)
  //    is told to sign in with Google.
  //  - an account that already has a password is told to sign in.
  if (existing) {
    if (existing.passwordHash) return { errorKey: "auth.errEmailTaken" };
    if (existing.status !== "invited") {
      return { errorKey: "auth.errEmailGoogle" };
    }
    const passwordHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash, status: "active", name: deriveName(email) })
      .where(eq(users.id, existing.id));
  } else {
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ email, name: deriveName(email), passwordHash });
  }

  // Sign the new account in via the same credentials path (will redirect on success).
  const returnTo = safeRedirect(String(formData.get("returnTo") ?? ""));
  try {
    await signIn("credentials", { email, password, redirectTo: returnTo });
  } catch (error) {
    // See signInWithPassword for why this must come before the AuthError check.
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return { errorKey: "auth.errAutoSignIn" };
    }
    throw error;
  }
  return {};
}

// Email/password sign-IN: delegate to the Credentials provider (throws a
// redirect on success, which Next handles; wrong creds throw AuthError).
export async function signInWithPassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { errorKey: "auth.errCredentialsRequired" };

  const returnTo = safeRedirect(String(formData.get("returnTo") ?? ""));
  const remember = formData.get("remember") === "true" ? "true" : "false";
  try {
    await signIn("credentials", { email, password, remember, redirectTo: returnTo });
  } catch (error) {
    // signIn() sets the session cookie and then throws redirect() on success.
    // On Next.js 16 a redirect caught in a try block is no longer recognised as
    // a control-flow redirect once it is re-thrown, so the Set-Cookie Auth.js
    // queued just before the throw is dropped from the response. The browser
    // then navigates to returnTo with no session cookie, and the login appears
    // to succeed while the navbar still shows "Login". unstable_rethrow hands
    // redirect/notFound back to the framework untouched; real errors fall
    // through to the AuthError check below.
    unstable_rethrow(error);
    if (error instanceof AuthError) return { errorKey: "auth.errCredentialsWrong" };
    throw error;
  }
  return {};
}

export async function signInWithGoogle(formData: FormData) {
  const returnTo = safeRedirect(String(formData.get("returnTo") ?? ""));
  const cookieStore = await cookies();
  cookieStore.set(LOGIN_REMEMBER_COOKIE, formData.get("remember") === "true" ? "true" : "false", {
    httpOnly: true,
    maxAge: 15 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  await signIn("google", { redirectTo: returnTo });
}
