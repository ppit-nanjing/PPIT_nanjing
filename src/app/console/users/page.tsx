import { db } from "@/db";
import { users, roles, departments, departmentMembers } from "@/db/schema";
import { UserTable } from "@/components/console/user-table";
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
    <div className="px-8 py-10">
      <h1 className="text-headline-lg text-on-background mb-2">Manajemen Pengguna</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {rows.length} pengguna terdaftar (dibuat otomatis saat pertama kali masuk dengan Google).
      </p>
      <UserTable users={rows} roles={allRoles} departments={allDepartments} />
    </div>
  );
}
