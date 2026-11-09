"use client";

import { useState } from "react";
import { UsersTabs } from "@/components/console/users-tabs";
import { UserTable } from "@/components/console/user-table";
import { StructureTable } from "@/components/console/structure-table";
import { Select, selectInput } from "@/components/console/form";

interface Row {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: "invited" | "active" | "inactive" | "suspended";
  roleId: string | null;
  cabinetRoleId: string | null;
  rantingRoleId: string | null;
  rantingId: string | null;
  departmentId: string | null;
  position: string;
  canResetPassword: boolean;
}
interface Role {
  id: string;
  name: string;
  accessTier: "full" | "scoped" | "advisory";
  category: "kabinet" | "ranting" | "advisory";
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
interface Ranting {
  id: string;
  code: string;
  label: string;
}

// Filter "Kategori"/segmentasi di atas tabel - sekarang mengikuti model role
// per kategori (Opsi B): Kategori 1 (BPH/pengurus kabinet/orang awam) +
// Kategori 2 (ranting di tingkat role & unitnya).
const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Semua Kategori" },
  { value: "bphKabinet", label: "BPH Kabinet" },
  { value: "pengurusKabinet", label: "Pengurus Kabinet (punya divisi)" },
  { value: "orangAwam", label: "Orang Awam" },
  { value: "bphRanting", label: "BPH Ranting" },
  { value: "anggotaRanting", label: "Anggota Ranting" },
  { value: "noDivision", label: "Belum ada divisi" },
  { value: "noAdminAccess", label: "Tanpa akses admin" },
];

const STATUSES: { value: Row["status"]; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
  { value: "suspended", label: "Ditangguhkan" },
];

export function UsersConsole({
  users,
  roles,
  departments,
  memberships,
  rantings,
}: {
  users: Row[];
  roles: Role[];
  departments: Department[];
  memberships: Membership[];
  rantings: Ranting[];
}) {
  const [tab, setTab] = useState<"list" | "structure">("list");
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const query = q.trim().toLowerCase();
  const selectCls = selectInput;

  // Filter kategori mengikuti model role per kategori (Opsi B). Kategori
  // Kabinet = role kabinet tier 'full' (Ketua Umum, Wakil, Sekretaris,
  // Bendahara). Pengurus kabinet = punya divisi (Koordinator/Anggota Divisi).
  // Orang awam = tanpa role mana pun + tanpa divisi.
  const filtered = users.filter((u) => {
    if (query && !`${u.name}\n${u.email}`.toLowerCase().includes(query)) return false;
    if (deptFilter && u.departmentId !== deptFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    const cabinetRole = roles.find((r) => r.id === u.cabinetRoleId);
    const rantingRole = roles.find((r) => r.id === u.rantingRoleId);
    if (catFilter === "bphKabinet" && cabinetRole?.accessTier !== "full") return false;
    else if (catFilter === "pengurusKabinet" && !u.departmentId) return false;
    else if (catFilter === "orangAwam" && (u.cabinetRoleId || u.rantingRoleId || u.departmentId)) return false;
    else if (catFilter === "bphRanting") {
      if (!rantingRole || !/bph ranting$/i.test(rantingRole.name.trim())) return false;
    } else if (catFilter === "anggotaRanting") {
      if (!rantingRole) return false;
      if (/bph ranting$/i.test(rantingRole.name.trim())) return false;
    } else if (catFilter === "noDivision" && u.departmentId) return false;
    else if (catFilter === "noAdminAccess" && (u.cabinetRoleId || u.rantingRoleId)) return false;
    return true;
  });

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
              className="bg-soft-gray rounded-md px-3 py-2.5 text-body-md sm:col-span-2 lg:col-span-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
            />
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls} aria-label="Filter divisi">
              <option value="">Semua Divisi</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls} aria-label="Filter status">
              <option value="">Semua Status</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className={`${selectCls} w-full sm:col-span-2 lg:col-span-4`}
              aria-label="Filter kategori"
            >
              {CATEGORY_FILTERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <UserTable users={filtered} roles={roles} departments={departments} rantings={rantings} />

          <p className="text-body-sm text-on-surface-variant mt-4 max-w-[62ch] leading-relaxed">
            Kolom <strong>Divisi &amp; peran</strong> menunjukkan divisi pengguna (mis. BPH, Program &amp; Acara · Akademia).
            Mengubah divisi atau status hanya mengajukan perubahan: tekan <strong>Terapkan</strong> supaya tersimpan.
            Akses admin (penuh/terbatas) diatur lewat tombol Edit. Masukkan ke Divisi Teknologi memberi akses penuh otomatis.
          </p>
        </>
      ) : (
        <StructureTable departments={departments} users={users} memberships={memberships} />
      )}
    </div>
  );
}
