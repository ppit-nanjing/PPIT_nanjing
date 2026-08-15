import bcrypt from "bcryptjs";

// Cost factor 12 - a deliberate balance between brute-force resistance and the
// ~250-400ms per-hash latency budget on a serverless function. Never lower this
// to speed up sign-in; bcrypt is intentionally slow.
const SALT_ROUNDS = 12;

// Hash a plaintext password with bcrypt. Returns the full hash string (salt +
// cost are embedded) - store it directly in users.passwordHash. Throws if the
// input is empty so a blank password can never be persisted as a valid hash.
export async function hashPassword(plain: string): Promise<string> {
  if (!plain) throw new Error("Password must not be empty");
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Timing-safe comparison against a stored bcrypt hash. Returns false (never
// throws) for a missing/invalid hash so authorize() can treat it as a failed
// login without leaking which case occurred.
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
