"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil, KeyRound, Trash2 } from "lucide-react";
import {
  updateUserRole,
  assignUserDepartment,
  updateUserStatus,
  updateUserDetails,
  deleteUser,
  sendPasswordResetLink,
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
  hasPassword: boolean;
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
// Compact variant for the desktop TABLE row only (not mobile cards, which
// already get selectClsFull). Written standalone rather than
// `${selectInput} ...` - appending classes that override the SAME property
// (padding, font size) as selectInput would tie the outcome to Tailwind's
// internal stylesheet ordering rather than source order, since both sides
// have equal selector specificity. Kept the "pp-select" hook for the shared
// chevron background (positioned at a fixed `right 0.65rem`, independent of
// padding, so pr-7 here is still safe) and dropped selectInput's own
// pl-3/pr-9/py-2.5/text-body-md instead of layering a conflicting override.
const selectClsTableBase =
  "pp-select bg-soft-gray rounded-md pl-2.5 pr-7 py-1.5 text-body-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container w-full truncate";
// Department/scope labels can be long ("Keuangan · Usaha Dana") but already
// tolerate truncation fine - the full value re-appears via the "Akses: X"
// line or by opening the dropdown. Status can't: "Ditangguhkan" measures
// ~93px at text-body-sm, so anything much narrower than ~8.5rem visibly
// clips it mid-word even though it's the shortest-valued column - narrower
// here would look broken, not just compact.
const selectClsTableDept = `${selectClsTableBase} max-w-[6rem]`;
const selectClsTableStatus = `${selectClsTableBase} max-w-[8.5rem]`;
// A `title` tooltip on the department/status selects covers the narrowest
// realistic console widths (~464px content, an expanded sidebar on a
// ~768px window), where "Ditangguhkan" still doesn't fully fit even at
// max-w-8.5rem - hovering reveals the full value rather than leaving it
// silently clipped.
const STATUS_LABEL: Record<Row["status"], string> = {
  invited: "Diundang",
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Ditangguhkan",
};

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
      {/* Tablet / desktop: tabel biasa. max-h + overflow-auto + thead sticky:
          dengan 149+ pengguna, tabel biasa berarti admin scroll jauh di
          seluruh halaman sampai kehilangan header kolom. Sekarang tabel
          sendiri yang scroll (vertikal & horizontal), header kolom tetap
          menempel di atas kotak scroll-nya. */}
      <div className="hidden sm:block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-auto max-h-[32rem]">
        <table className="w-full text-body-md">
          <thead className="sticky top-0 z-10 bg-surface-container-low text-label-caps uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="text-left px-3 py-2">Pengguna</th>
              <th className="text-left px-3 py-2">Role / Ruang Lingkup</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Aksi</th>
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
        <td className="px-3 py-2 max-w-[14rem]">
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
        <td className="px-3 py-2 max-w-[9rem] truncate text-on-surface-variant">{scopeLabel(byId.get(user.departmentId ?? ""), byId)}</td>
        <td className="px-3 py-2 text-on-surface-variant">{status}</td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1.5">
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
              className="text-label-caps uppercase tracking-wide px-2 py-1 rounded-md bg-primary-container text-on-primary hover:bg-primary transition-colors disabled:opacity-50"
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
              className="text-label-caps uppercase tracking-wide px-2 py-1 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
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
          {user.hasPassword && (
            <ConfirmButton
              onConfirm={() => sendPasswordResetLink(user.id)}
              title="Kirim link reset password?"
              message={`Email berisi tautan reset password (berlaku 1 jam) akan dikirim ke ${user.email}.`}
              confirmLabel="Ya, kirim"
              danger={false}
              successMessage="Link reset password terkirim."
              className="flex-1 text-label-caps uppercase tracking-wide px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
            >
              Reset Sandi
            </ConfirmButton>
          )}
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
      <td className="px-3 py-2 max-w-[7.5rem]">
        <div className="flex items-center gap-2 min-w-0" title={`${user.name ?? "(tanpa nama)"} · ${user.email}`}>
          {avatar}
          <div className="min-w-0">
            <p className="font-medium text-on-background truncate">{user.name ?? "(tanpa nama)"}</p>
            <p className="text-label-caps text-on-surface-variant truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 max-w-[7rem]">
        <Select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            startTransition(() => assignUserDepartment(user.id, e.target.value, user.position));
          }}
          className={selectClsTableDept}
          aria-label="Divisi"
          title={scopeLabel(options.find((d) => d.id === departmentId), byId)}
        >
          <option value="">— Belum ada —</option>
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {scopeLabel(d, byId)}
            </option>
          ))}
        </Select>
        {roleName && (
          <p className="text-label-caps text-on-surface-variant mt-1 truncate" title={`Akses: ${roleName}`}>
            Akses: {roleName}
          </p>
        )}
      </td>
      <td className="px-3 py-2 max-w-[10rem]">
        <Select
          value={status}
          onChange={(e) => {
            const next = e.target.value as Row["status"];
            setStatus(next);
            startTransition(() => updateUserStatus(user.id, next));
          }}
          className={selectClsTableStatus}
          aria-label="Status pengguna"
          title={STATUS_LABEL[status]}
        >
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
          <option value="suspended">Ditangguhkan</option>
        </Select>
      </td>
      <td className="px-3 py-2 text-right">
        {/* Icon-only in the table row (unlike the mobile card layout below,
            which keeps full text - plenty of vertical room there): the text
            pill version of these 3 actions was the single biggest
            contributor to the table's horizontal width. aria-label keeps
            them accessible; native `title` on the plain Edit button and
            ConfirmButton's own confirmation dialog cover the rest. */}
        <div className="flex flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            aria-label="Edit"
            className="p-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
          >
            <Pencil size={15} aria-hidden />
          </button>
          {user.hasPassword && (
            <ConfirmButton
              onConfirm={() => sendPasswordResetLink(user.id)}
              title="Kirim link reset password?"
              message={`Email berisi tautan reset password (berlaku 1 jam) akan dikirim ke ${user.email}.`}
              confirmLabel="Ya, kirim"
              danger={false}
              successMessage="Link reset password terkirim."
              aria-label="Reset Sandi"
              className="p-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:text-on-background transition-colors"
            >
              <KeyRound size={15} aria-hidden />
            </ConfirmButton>
          )}
          <ConfirmButton
            onConfirm={async () => {
              await deleteUser(user.id);
              router.refresh();
            }}
            title="Hapus pengguna?"
            message="Tindakan ini tidak dapat dibatalkan."
            aria-label="Hapus"
            className="p-1.5 rounded-md border border-error/40 text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 size={15} aria-hidden />
          </ConfirmButton>
        </div>
      </td>
    </tr>
  );
}
