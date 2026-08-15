/**
 * One-off: add a user to Divisi Teknologi (grantsFullAdminAccess = true) so they
 * get full /console access without fabricating an organizational leadership
 * role title for them - matches that division's actual purpose ("merintis &
 * memelihara website resmi PPIT Nanjing").
 * Run with: npx tsx --env-file=.env src/db/make-admin.ts <email>
 */
import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { users, departments, departmentMembers } from "./schema";

async function main() {
  const email = process.argv[2];
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`No user found for ${email} - they need to sign in with Google at least once first`);

  const [teknologi] = await db.select().from(departments).where(eq(departments.name, "Divisi Teknologi"));
  if (!teknologi) throw new Error("Divisi Teknologi not found - run seed.ts first");

  const [existing] = await db
    .select()
    .from(departmentMembers)
    .where(and(eq(departmentMembers.userId, user.id), eq(departmentMembers.departmentId, teknologi.id)));

  if (existing) {
    console.log(`${email} is already a member of Divisi Teknologi`);
    return;
  }

  await db.insert(departmentMembers).values({ userId: user.id, departmentId: teknologi.id, position: "Developer" });
  console.log(`Added ${email} to Divisi Teknologi - full admin access granted`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
