"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserRole,
  assignUserDepartment,
  updateUserStatus,
  updateUserDetails,
  deleteUser,
} from "@/app/actions/admin-users";

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
}

export function UserTable({
  users,
  roles,
  departments,
}: {
  users: Row[];
  roles: Role[];
  departments: Department[];
}) {
  // Only leaf departments (divisions/BPH) make sense to assign someone to -
  // the 3 top-level "Departemen" rows are just groupings.
  const assignable = departments.filter(
    (d) => d.parentDepartmentId !== null || !departments.some((c) => c.parentDepartmentId === d.id)
  );

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
      <table className="w-full text-body-md min-w-[860px]">
        <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
          <tr>
            <th className="text-left px-5 py-3">Pengguna</th>
            <th className="text-left px-5 py-3">Role</th>
            <th className="text-left px-5 py-3">Divisi</th>
            <th className="text-left px-5 py-3">Status</th>
            <th className="text-right px-5 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow key={u.id} user={u} roles={roles} departments={assignable} />
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-10 text-on-surface-variant">
                Tidak ada pengguna yang cocok dengan filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({
  user,
  roles,
  departments,
}: {
  user: Row;
  roles: Role[];
  departments: Department[];
}) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [status, setStatus] = useState(user.status);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [, startTransition] = useTransition();

  if (editing) {
    return (
      <tr className="border-t border-outline-variant">
        <td className="px-5 py-3">
          <div className="flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama"
              className="bg-soft-gray rounded-md px-2 py-1.5 text-body-md"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="bg-soft-gray rounded-md px-2 py-1.5 text-body-md"
            />
          </div>
        </td>
        <td className="px-5 py-3 text-on-surface-variant">—</td>
        <td className="px-5 py-3 text-on-surface-variant">—</td>
        <td className="px-5 py-3 text-on-surface-variant">{status}</td>
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!name.trim() || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  await updateUserDetails(user.id, name, email);
                  setEditing(false);
                  router.refresh();
                })
              }
              className="text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md bg-primary-container text-on-primary hover:bg-primary transition-colors disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setName(user.name ?? "");
                setEmail(user.email);
                setEditing(false);
              }}
              className="text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
            >
              Batal
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-outline-variant">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-surface-container-low" />
          )}
          <div>
            <p className="font-medium text-on-background">{user.name ?? "(tanpa nama)"}</p>
            <p className="text-label-caps text-on-surface-variant">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <select
          value={roleId}
          onChange={(e) => {
            setRoleId(e.target.value);
            startTransition(() => updateUserRole(user.id, e.target.value));
          }}
          className="bg-soft-gray rounded-md px-2 py-1.5 text-body-md"
        >
          <option value="">— Belum ada —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3">
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            startTransition(() => assignUserDepartment(user.id, e.target.value, user.position));
          }}
          className="bg-soft-gray rounded-md px-2 py-1.5 text-body-md"
        >
          <option value="">— Belum ada —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3">
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value as Row["status"];
            setStatus(next);
            startTransition(() => updateUserStatus(user.id, next));
          }}
          className="bg-soft-gray rounded-md px-2 py-1.5 text-body-md"
        >
          <option value="invited">Diundang</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="suspended">Ditangguhkan</option>
        </select>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Hapus pengguna ini? Tindakan tidak dapat dibatalkan.")) {
                startTransition(async () => {
                  await deleteUser(user.id);
                  router.refresh();
                });
              }
            }}
            className="text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-error/40 text-error hover:bg-error/10 transition-colors"
          >
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
