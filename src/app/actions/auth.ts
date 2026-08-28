"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LOGIN_REMEMBER_COOKIE, signIn } from "@/auth";
import { hashPassword } from "@/lib/password";
import { safeRedirect } from "@/lib/safe-redirect";
import { sendEmail } from "@/lib/email";
import { renderMembershipEmail, renderMembershipEmailText } from "@/lib/membership-email";
import { createResetToken, consumeResetToken, purgeExpiredResetTokens } from "@/lib/password-reset";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Carries a dictionary KEY, not a finished sentence: this runs on the server
// where the request locale is known but the dictionary is not the natural
// place to reach for, and <CredentialForm> already has useT() to render it.
export type AuthFormState = {
  errorKey?: TKey;
  vars?: Record<string, string | number>;
  // Dipakai alur "lupa password": permintaan diproses (pesannya selalu generik
  // supaya tidak membocorkan apakah email terdaftar).
  done?: boolean;
};

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

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

// Cooldown per alamat email untuk permintaan reset. Best-effort (Map in-memory
// per instance Lambda, sama caveat-nya seperti throttle sign-in di auth.ts) -
// cukup untuk mencegah satu orang membombardir inbox korban / menghabiskan
// kuota harian Gmail lewat form yang responsnya selalu sama.
const RESET_COOLDOWN_MS = 90 * 1000;
const lastResetRequest = new Map<string, number>();

// Minta tautan reset password. Responsnya SELALU sama ("cek email") apa pun
// hasilnya - tidak membocorkan apakah alamat itu terdaftar atau akun Google.
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { errorKey: "auth.errEmailInvalid" };

  const last = lastResetRequest.get(email) ?? 0;
  if (Date.now() - last < RESET_COOLDOWN_MS) return { done: true };
  lastResetRequest.set(email, Date.now());

  try {
    await purgeExpiredResetTokens();
    const [user] = await db
      .select({ id: users.id, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email));

    // Hanya akun yang PUNYA password yang bisa direset. Akun Google-only tidak
    // dikirimi apa pun (mereka masuk lewat Google) - pesan generik menutupinya.
    if (user?.passwordHash) {
      const token = await createResetToken(user.id);
      const link = `${await requestOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
      const heading = "Reset password akun PPIT Nanjing";
      const body = [
        `Halo ${user.name ?? "Anggota"},`,
        "Kami menerima permintaan untuk mengganti password akun kamu. Klik tombol di bawah untuk membuat password baru. Tautan ini berlaku 1 jam.",
        "Kalau kamu tidak meminta ini, abaikan saja email ini — password kamu tidak berubah.",
        "---",
        `Hi ${user.name ?? "there"}, we received a request to reset your PPIT Nanjing account password. Use the button below to set a new one; the link expires in 1 hour. If you didn't request this, ignore this email.`,
      ].join("\n\n");
      await sendEmail({
        to: email,
        subject: heading,
        html: renderMembershipEmail({
          heading,
          body,
          ctaLabel: "Buat password baru",
          ctaUrl: link,
          footerNote: "Email ini dikirim otomatis oleh sistem akun PPIT Nanjing. Jangan teruskan tautan di atas ke siapa pun.",
        }),
        text: renderMembershipEmailText({
          heading,
          body,
          ctaLabel: "Buat password baru / Set a new password",
          ctaUrl: link,
          footerNote: "Email ini dikirim otomatis oleh sistem akun PPIT Nanjing. Jangan teruskan tautan di atas ke siapa pun.",
        }),
      });
    }
  } catch (err) {
    // Jangan bocorkan kegagalan internal lewat pesan berbeda - tetap "done".
    console.error("[auth] password reset request failed:", err);
  }

  return { done: true };
}

// Selesaikan reset: token + password baru -> set passwordHash, lalu ke /login.
export async function completePasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { errorKey: "auth.errResetInvalid" };
  if (password.length < MIN_PASSWORD) return { errorKey: "auth.errPasswordShort", vars: { n: MIN_PASSWORD } };
  if (password !== confirm) return { errorKey: "auth.errConfirmMismatch" };

  const userId = await consumeResetToken(token);
  if (!userId) return { errorKey: "auth.errResetInvalid" };

  const passwordHash = await hashPassword(password);
  // status: kalau akun masih "invited" (mustahil di jalur ini, tapi murah), jadi
  // aktif. Akun aktif tidak berubah statusnya.
  await db.update(users).set({ passwordHash, status: "active" }).where(eq(users.id, userId));

  // Sesi lama berbasis JWT dan tidak bisa dicabut dari sini - risiko kecil,
  // token reset sudah dikonsumsi dan hanya berlaku 1 jam. Arahkan ke login.
  redirect("/login?reset=1");
}
