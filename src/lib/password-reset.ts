import { randomBytes, createHash } from "crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens } from "@/db/schema";

// Tautan reset berlaku 1 jam - cukup untuk cek email, cukup pendek supaya tautan
// lama di inbox tidak jadi celah.
export const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Buat token reset untuk satu user. Mengembalikan token MENTAH (untuk ditaruh di
 * tautan email) - yang tersimpan di DB cuma sha256-nya. Token lama user ini
 * dihapus dulu, jadi hanya tautan terakhir yang berlaku.
 */
export async function createResetToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return raw;
}

/**
 * Tukar token mentah dengan userId-nya bila valid & belum kadaluarsa, lalu
 * HAPUS semua token reset user itu (sekali pakai). Mengembalikan null untuk
 * token yang tidak dikenali / sudah lewat - pemanggil memperlakukan keduanya
 * sebagai "tautan tidak valid" tanpa membedakan.
 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  if (!raw) return null;
  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(raw)));
  if (!row) return null;
  // Bersihkan token user ini apa pun hasilnya - kadaluarsa berarti tetap mati.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.userId;
}

/** Sapu token kadaluarsa - dipanggil oportunistik saat ada permintaan reset. */
export async function purgeExpiredResetTokens(): Promise<void> {
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
}
