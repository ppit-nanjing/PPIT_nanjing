"use client";

import { useState } from "react";
import { UsersTabs } from "@/components/console/users-tabs";
import { UserTable } from "@/components/console/user-table";
import { StructureTable } from "@/components/console/structure-table";
import { InviteUserForm } from "@/components/console/invite-user-form";

interface Row {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: "invited" | "active" | "inactive" | "suspended";
  roleId: string | null;
  departmentId: string | null;
  position: string;
}
interface Role {
  id: string;
  name: string;
}
interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
  orderIndex: number;
}
interface Membership {
  userId: string;
  departmentId: string;
  position: string | null;
}

const STATUSES: { value: Row["status"]; label: string }[] = [
  { value: "invited", label: "Diundang" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspended", label: "Ditangguhkan" },
];

export function UsersConsole({
  users,
  roles,
  departments,
  memberships,
}: {
  users: Row[];
  roles: Role[];
  departments: Department[];
  memberships: Membership[];
}) {
  const [tab, setTab] = useState<"list" | "structure">("list");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const query = q.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (query && !`${u.name}\n${u.email}`.toLowerCase().includes(query)) return false;
    if (roleFilter && u.roleId !== roleFilter) return false;
    if (deptFilter && u.departmentId !== deptFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (catFilter === "member" && !u.departmentId) return false;
    if (catFilter === "noDivision" && u.departmentId) return false;
    if (catFilter === "noRole" && u.roleId) return false;
    return true;
  });

  const selectCls = "bg-soft-gray rounded-md px-2 py-1.5 text-body-md";

  return (
    <div>
      <UsersTabs active={tab} onTab={setTab} />

      {tab === "list" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama/email…"
              className={`${selectCls} sm:col-span-2 lg:col-span-1`}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectCls}>
              <option value="">Semua Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls}>
              <option value="">Semua Divisi</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              <option value="">Semua Status</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${selectCls} sm:col-span-2 lg:col-span-4`}>
              <option value="all">Semua Kategori</option>
              <option value="member">Anggota PPIT (punya divisi)</option>
              <option value="noDivision">Belum ada divisi</option>
              <option value="noRole">Belum ada role</option>
            </select>
          </div>

          <InviteUserForm roles={roles} departments={departments} />
          <UserTable users={filtered} roles={roles} departments={departments} />

          <p className="text-label-caps text-on-surface-variant mt-4 leading-relaxed">
            &quot;Kasih admin&quot; = pilih role dengan akses penuh (mis. Ketua Umum / Koordinator Divisi) atau masukkan ke
            Divisi Teknologi (memberi akses penuh otomatis). Menghapus akses cukup set role/divisi kembali. Status
            &quot;Diundang&quot; berarti akun dibuat admin tapi baru aktif setelah orangnya pertama kali masuk.
          </p>
        </>
      ) : (
        <StructureTable departments={departments} users={users} memberships={memberships} />
      )}
    </div>
  );
}
