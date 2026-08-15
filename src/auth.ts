import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, roles, departmentMembers, departments } from "@/db/schema";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      const scope = await resolveAdminScope(user.id);
      session.user.adminScope = scope;
      session.user.isAdmin = scope === "full" || (Array.isArray(scope) && scope.length > 0);
      session.user.emailSubscribed = await resolveEmailSubscribed(user.id);
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
