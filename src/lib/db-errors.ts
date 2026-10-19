// Penanda error Postgres yang dipakai beberapa server action. Driver (Neon HTTP,
// drizzle) membungkus error aslinya beberapa lapis lewat `cause`, jadi kodenya
// dicari menyusuri rantai itu, bukan hanya di lapisan terluar.

/** true bila error (atau salah satu `cause`-nya) adalah unique violation (23505). */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: unknown }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return false;
}
