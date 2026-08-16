import { db } from "@/db";
import { users, roles, departments, departmentMembers } from "@/db/schema";
import { UsersConsole } from "@/components/console/users-console";
import { requireModuleAccess } from "@/lib/admin-scope";

export default async function ConsoleUsersPage() {
  await requireModuleAccess("users");
  const allUsers = await db.select().from(users);
  const allRoles = await db.select().from(roles);
  const allDepartments = await db.select().from(departments);
  const memberships = await db.select().from(departmentMembers);

  const rows = allUsers.map((u) => {
    const membership = memberships.find((m) => m.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      status: u.status,
      roleId: u.roleId,
      departmentId: membership?.departmentId ?? null,
      position: membership?.position ?? "",
    };
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Manajemen Pengguna</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {rows.length} pengguna terdaftar. Akun bisa dibuat admin (status &quot;Diundang&quot;) sebelum orangnya masuk
        pertama kali, atau muncul otomatis saat masuk dengan Google/daftar kata sandi.
      </p>
      <UsersConsole
        users={rows}
        roles={allRoles}
        departments={allDepartments}
        memberships={memberships}
      />
    </div>
  );
}
