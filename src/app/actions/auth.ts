"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/password";

export type AuthFormState = { error?: string };

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

  if (!EMAIL_RE.test(email)) return { error: "Format email tidak valid." };
  if (password.length < MIN_PASSWORD) return { error: `Kata sandi minimal ${MIN_PASSWORD} karakter.` };
  if (password !== confirm) return { error: "Konfirmasi kata sandi tidak cocok." };

  const [existing] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));

  // Respect the existing unique(email) constraint rather than creating a
  // second row: an existing Google-OAuth-only account (no passwordHash) is told
  // to sign in with Google; one that already has a password is told to sign in.
  if (existing) {
    return existing.passwordHash
      ? { error: "Email sudah terdaftar. Masuk dengan kata sandi kamu." }
      : { error: "Email ini sudah terdaftar lewat Google. Masuk dengan Google." };
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, name: deriveName(email), passwordHash });

  // Sign the new account in via the same credentials path (will redirect on success).
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Pendaftaran berhasil, tapi gagal masuk otomatis. Coba masuk manual." };
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
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Email atau kata sandi salah." };
    throw error;
  }
  return {};
}
