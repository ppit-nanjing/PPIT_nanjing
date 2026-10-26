/**
 * Admin lokal untuk lingkungan Docker/Dokploy di mesin sendiri: login Google
 * butuh kredensial OAuth asli, jadi satu user dengan password dibuat di sini
 * supaya /console bisa dibuka. Sengaja bukan bagian dari seed.ts - seed itu
 * dipakai di database sungguhan juga.
 *
 * Run with:
 *   npx tsx --env-file=.env.local src/db/seed-local-admin.ts <email> <password>
 *
 * Menolak jalan kalau DATABASE_URL bukan database lokal, karena script ini
 * menulis hash password dan tidak boleh menyentuh Neon produksi.
 */
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { users, departments, departmentMembers } from "./schema";
import { hashPassword } from "@/lib/password";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal", "db"]);

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: seed-local-admin.ts <email> <password>");
  }

  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `DATABASE_URL menunjuk ke ${url.hostname}, bukan database lokal - script ini tidak boleh jalan di sana.`,
    );
  }
  if (password.length < 8) throw new Error("Password minimal 8 karakter");

  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ email: normalized, name: "Admin Lokal", status: "active", emailVerified: new Date(), passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, status: "active" } })
    .returning({ id: users.id });

  const [teknologi] = await db.select().from(departments).where(eq(departments.name, "Divisi Teknologi"));
  if (!teknologi) throw new Error("Divisi Teknologi tidak ada - jalankan `npm run db:seed` dulu");

  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(and(eq(departmentMembers.userId, user.id), eq(departmentMembers.departmentId, teknologi.id)));
  if (!member) {
    await db
      .insert(departmentMembers)
      .values({ userId: user.id, departmentId: teknologi.id, position: "Developer" });
  }

  console.log(`${normalized} siap login dengan password lokal, akses /console penuh.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
