"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateUserRole,
  assignUserDepartment,
  updateUserStatus,
  updateUserDetails,
  deleteUser,
} from "@/app/actions/admin-users";
import { ConfirmButton } from "@/components/console/confirm-button";
import { Select, selectInput } from "@/components/console/form";

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

type Layout = "table" | "card";

const selectCls = selectInput;
const selectClsFull = `${selectInput} w-full`;
const labelCls = "text-label-caps text-on-surface-variant";

function isAssignable(dept: Department, all: Department[]): boolean {
  // Leaf divisions (have a parent) plus top-level nodes without children
  // (e.g. BPH). The 3 grouping "Departemen" rows are just containers.
  if (dept.parentDepartmentId !== null) return true;
  return !all.some((c) => c.parentDepartmentId === dept.id);
}

function scopeLabel(dept: Department | undefined, byId: Map<string, Department>): string {
  if (!dept) return "— Belum ada —";
  if (dept.parentDepartmentId) {
    const parent = byId.get(dept.parentDepartmentId);
    const parentShort = parent ? parent.name.replace(/^Departemen\s+/i, "") : "";
    const childShort = dept.name.replace(/^Divisi\s+/i, "");
    return parentShort ? `${parentShort} · ${childShort}` : dept.name;
  }
  return dept.name.replace(/^Departemen\s+/i, "") || dept.name;
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
  const byId = new Map(departments.map((d) => [d.id, d]));
  const assignable = departments.filter((d) => isAssignable(d, departments));

  return (
    <>
      {/* Tablet / desktop: tabel biasa */}
      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-md">
          <thead className="bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-5 py-3">Pengguna</th>
              <th className="text-left px-5 py-3">Role / Ruang Lingkup</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                roles={roles}
                departments={assignable}
                byId={byId}
                layout="table"
              />
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-on-surface-variant">
                  Tidak ada pengguna yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile (S/M/L): kartu vertikal */}
      <div className="sm:hidden flex flex-col gap-3">
        {users.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Tidak ada pengguna yang cocok dengan filter.</p>
        ) : (
          users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              roles={roles}
              departments={assignable}
              byId={byId}
              layout="card"
            />
          ))
        )}
      </div>
    </>
  );
}

function UserRow({
  user,
  roles,
  departments,
  byId,
  layout,
}: {
  user: Row;
  roles: Role[];
  departments: Department[];
  byId: Map<string, Department>;
  layout: Layout;
}) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(user.roleId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [status, setStatus] = useState(user.status);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [, startTransition] = useTransition();

  // Options: assignable departments, plus the user's current one if not assignable.
  const options = departments.some((d) => d.id === user.departmentId)
    ? departments
    : user.departmentId
      ? [...departments, byId.get(user.departmentId)!].filter(Boolean)
      : departments;

  const roleName = roles.find((r) => r.id === user.roleId)?.name;

  const avatar = user.image ? (
    <Image src={user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-surface-container-low shrink-0" />
  );

  if (editing) {
    if (layout === "card") {
      return (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama"
            className={`${selectClsFull}`}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className={`${selectClsFull}`}
          />
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={`${selectClsFull}`} aria-label="Role admin">
            <option value="">— Tanpa akses admin —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!name.trim() || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  await updateUserDetails(user.id, name, email);
                  await updateUserRole(user.id, roleId);
                  setEditing(false);
                  router.refresh();
                })
              }
              className="flex-1 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md bg-primary-container text-on-primary hover:bg-primary transition-colors disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setName(user.name ?? "");
                setEmail(user.email);
                setRoleId(user.roleId ?? "");
                setEditing(false);
              }}
              className="flex-1 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      );
    }
    return (
      <tr className="border-t border-outline-variant">
        <td className="px-5 py-3">
          <div className="flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" className={selectCls} />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className={selectCls}
            />
            <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={selectCls} aria-label="Role admin">
              <option value="">— Tanpa akses admin —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </td>
        <td className="px-5 py-3 text-on-surface-variant">{scopeLabel(byId.get(user.departmentId ?? ""), byId)}</td>
        <td className="px-5 py-3 text-on-surface-variant">{status}</td>
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!name.trim() || !email.trim()}
              onClick={() =>
                startTransition(async () => {
                  await updateUserDetails(user.id, name, email);
                  await updateUserRole(user.id, roleId);
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
                setRoleId(user.roleId ?? "");
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

  if (layout === "card") {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {avatar}
          <div className="min-w-0">
            <p className="font-medium text-on-background truncate">{user.name ?? "(tanpa nama)"}</p>
            <p className="text-label-caps text-on-surface-variant truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelCls}>Role / Ruang Lingkup</span>
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              startTransition(() => assignUserDepartment(user.id, e.target.value, user.position));
            }}
            className={selectClsFull}
            aria-label="Divisi"
          >
            <option value="">— Belum ada —</option>
            {options.map((d) => (
              <option key={d.id} value={d.id}>
                {scopeLabel(d, byId)}
              </option>
            ))}
          </Select>
          {roleName && <p className={labelCls}>Akses: {roleName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelCls}>Status</span>
          <Select
            value={status}
            onChange={(e) => {
              const next = e.target.value as Row["status"];
              setStatus(next);
              startTransition(() => updateUserStatus(user.id, next));
            }}
            className={selectClsFull}
            aria-label="Status pengguna"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="suspended">Ditangguhkan</option>
          </Select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
          >
            Edit
          </button>
          <ConfirmButton
            onConfirm={async () => {
              await deleteUser(user.id);
              router.refresh();
            }}
            title="Hapus pengguna?"
            message="Tindakan ini tidak dapat dibatalkan."
            className="flex-1 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-error/40 text-error hover:bg-error/10 transition-colors"
          >
            Hapus
          </ConfirmButton>
        </div>
      </div>
    );
  }

  return (
    <tr className="border-t border-outline-variant">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {avatar}
          <div>
            <p className="font-medium text-on-background">{user.name ?? "(tanpa nama)"}</p>
            <p className="text-label-caps text-on-surface-variant">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <Select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            startTransition(() => assignUserDepartment(user.id, e.target.value, user.position));
          }}
          className={selectCls}
          aria-label="Divisi"
        >
          <option value="">— Belum ada —</option>
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {scopeLabel(d, byId)}
            </option>
          ))}
        </Select>
        {roleName && <p className="text-label-caps text-on-surface-variant mt-1">Akses: {roleName}</p>}
      </td>
      <td className="px-5 py-3">
        <Select
          value={status}
          onChange={(e) => {
            const next = e.target.value as Row["status"];
            setStatus(next);
            startTransition(() => updateUserStatus(user.id, next));
          }}
          className={selectCls}
          aria-label="Status pengguna"
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="suspended">Ditangguhkan</option>
        </Select>
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
          <ConfirmButton
            onConfirm={async () => {
              await deleteUser(user.id);
              router.refresh();
            }}
            title="Hapus pengguna?"
            message="Tindakan ini tidak dapat dibatalkan."
            className="text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-error/40 text-error hover:bg-error/10 transition-colors"
          >
            Hapus
          </ConfirmButton>
        </div>
      </td>
    </tr>
  );
}
