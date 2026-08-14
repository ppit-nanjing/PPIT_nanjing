import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, departmentMembers, departments } from "@/db/schema";

// Admin-access rule per docs/Data Dictionary.md "Admin Access Rule" (sourced from the
// 2026/2027 recruitment guidebook): a user gets full admin access if their role's
// accessTier is 'full' (Ketua Umum, BPH, any Koordinator Divisi) OR they belong to a
// department with grantsFullAdminAccess = true (every member of Divisi Teknologi,
// coordinator or not - they build/maintain the system).
async function resolveIsAdmin(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ accessTier: roles.accessTier })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (user?.accessTier === "full") return true;

  const memberships = await db
    .select({ grantsFullAdminAccess: departments.grantsFullAdminAccess })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));

  return memberships.some((m) => m.grantsFullAdminAccess);
}

async function resolveEmailSubscribed(userId: string): Promise<boolean | null> {
  const [user] = await db.select({ emailSubscribed: users.emailSubscribed }).from(users).where(eq(users.id, userId));
  return user?.emailSubscribed ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.isAdmin = await resolveIsAdmin(user.id);
      session.user.emailSubscribed = await resolveEmailSubscribed(user.id);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
