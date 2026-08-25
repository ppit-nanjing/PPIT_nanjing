import { db } from "@/db";
import { departments, departmentMembers, roles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";

// Same hardening as the other console exports - see
// api/console/events/[id]/registrations/export for the reasoning.
function csvCell(value: unknown): string {
  let s: string;
  if (value == null) s = "";
  else if (Array.isArray(value)) s = value.join(", ");
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const STATUS_LABEL: Record<string, string> = {
  invited: "Diundang",
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Ditangguhkan",
};

export async function GET() {
  await requireModuleAccess("users");

  const [allUsers, allRoles, memberships, allDepartments] = await Promise.all([
    db.select().from(users),
    db.select().from(roles),
    db.select().from(departmentMembers),
    db.select().from(departments),
  ]);
  const roleById = new Map(allRoles.map((r) => [r.id, r.name]));
  const deptById = new Map(allDepartments.map((d) => [d.id, d.name]));
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]));

  const header = ["Nama", "Email", "Status", "Role", "Divisi", "Jabatan"];
  const lines = [header.map(csvCell).join(",")];
  for (const u of allUsers.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))) {
    const m = membershipByUser.get(u.id);
    lines.push(
      [u.name ?? "", u.email, STATUS_LABEL[u.status] ?? u.status, roleById.get(u.roleId ?? "") ?? "", m ? deptById.get(m.departmentId) ?? "" : "", m?.position ?? ""]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pengguna-ppit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
