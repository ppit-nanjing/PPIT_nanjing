"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Pencil, Plus, X } from "lucide-react";
import { createDepartment, updateDepartment, moveDepartment } from "@/app/actions/admin-departments";
import { ASSIGNABLE_SCOPE_KEYS } from "@/lib/admin-scope";

interface Department {
  id: string;
  name: string;
  description: string | null;
  parentDepartmentId: string | null;
  orderIndex: number;
  grantsFullAdminAccess: boolean;
  adminModuleScope: string[];
}

export function DepartmentManager({ departments }: { departments: Department[] }) {
  const [showAddFor, setShowAddFor] = useState<string | "root" | null>(null);
  const topLevel = departments.filter((d) => d.parentDepartmentId === null).sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="flex flex-col gap-4">
      {topLevel.map((dept, i) => (
        <DepartmentCard
          key={dept.id}
          dept={dept}
          children={departments.filter((d) => d.parentDepartmentId === dept.id).sort((a, b) => a.orderIndex - b.orderIndex)}
          isFirst={i === 0}
          isLast={i === topLevel.length - 1}
          showAddFor={showAddFor}
          setShowAddFor={setShowAddFor}
        />
      ))}

      <button
        onClick={() => setShowAddFor(showAddFor === "root" ? null : "root")}
        className="flex items-center gap-2 text-label-caps text-primary-container hover:text-primary self-start"
      >
        <Plus size={16} /> Tambah Departemen
      </button>
      {showAddFor === "root" && <AddForm parentDepartmentId={null} onDone={() => setShowAddFor(null)} />}
    </div>
  );
}

// Checkbox list shared by the top-level department edit form and the division
// edit form - access is meaningful at either level (a department itself can
// have direct members, not just its divisions).
function AccessFields({ dept }: { dept: Department }) {
  return (
    <div className="bg-surface-container-lowest rounded-md p-3 flex flex-col gap-2">
      <label className="flex items-center gap-2 text-body-md text-on-background">
        <input type="checkbox" name="grantsFullAdminAccess" defaultChecked={dept.grantsFullAdminAccess} className="w-4 h-4" />
        Berikan akses admin penuh ke semua anggota (mis. Divisi Teknologi)
      </label>
      <p className="text-label-caps text-on-surface-variant uppercase tracking-wide mt-1">
        Modul admin yang bisa diakses (untuk anggota dengan role &apos;scoped&apos;)
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {ASSIGNABLE_SCOPE_KEYS.map((m) => (
          <label key={m.key} className="flex items-center gap-2 text-label-caps text-on-background">
            <input
              type="checkbox"
              name="adminModuleScope"
              value={m.key}
              defaultChecked={dept.adminModuleScope.includes(m.key)}
              className="w-3.5 h-3.5"
            />
            {m.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function DepartmentCard({
  dept,
  children,
  isFirst,
  isLast,
  showAddFor,
  setShowAddFor,
}: {
  dept: Department;
  children: Department[];
  isFirst: boolean;
  isLast: boolean;
  showAddFor: string | "root" | null;
  setShowAddFor: (v: string | "root" | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-start gap-2">
          <div className="flex flex-col mt-1">
            <button
              disabled={isFirst}
              onClick={() => startTransition(() => moveDepartment(dept.id, "up"))}
              className="text-secondary hover:text-on-background disabled:opacity-20"
            >
              <ChevronUp size={16} />
            </button>
            <button
              disabled={isLast}
              onClick={() => startTransition(() => moveDepartment(dept.id, "down"))}
              className="text-secondary hover:text-on-background disabled:opacity-20"
            >
              <ChevronDown size={16} />
            </button>
          </div>
          <div>
            <h2 className="text-headline-md text-on-background">{dept.name}</h2>
            {dept.description && !editing && (
              <p className="text-body-md text-on-surface-variant mt-1">{dept.description}</p>
            )}
          </div>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="text-secondary hover:text-on-background shrink-0">
          {editing ? <X size={16} /> : <Pencil size={16} />}
        </button>
      </div>

      {editing && (
        <form
          action={(fd) => {
            updateDepartment(dept.id, fd);
            setEditing(false);
          }}
          className="flex flex-col gap-2 mb-4 mt-3"
        >
          <input name="name" defaultValue={dept.name} className="bg-soft-gray rounded-md p-2 text-body-md" />
          <textarea
            name="description"
            defaultValue={dept.description ?? ""}
            rows={2}
            className="bg-soft-gray rounded-md p-2 text-body-md resize-none"
          />
          <AccessFields dept={dept} />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase px-4 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Simpan
          </button>
        </form>
      )}

      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {children.map((c, i) => (
            <DivisionCard key={c.id} division={c} isFirst={i === 0} isLast={i === children.length - 1} />
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAddFor(showAddFor === dept.id ? null : dept.id)}
        className="flex items-center gap-2 text-label-caps text-primary-container hover:text-primary mt-4"
      >
        <Plus size={14} /> Tambah Divisi
      </button>
      {showAddFor === dept.id && <AddForm parentDepartmentId={dept.id} onDone={() => setShowAddFor(null)} />}
    </div>
  );
}

function DivisionCard({ division, isFirst, isLast }: { division: Department; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-start gap-1.5">
          <div className="flex flex-col mt-0.5">
            <button
              disabled={isFirst}
              onClick={() => startTransition(() => moveDepartment(division.id, "up"))}
              className="text-secondary hover:text-on-background disabled:opacity-20"
            >
              <ChevronUp size={13} />
            </button>
            <button
              disabled={isLast}
              onClick={() => startTransition(() => moveDepartment(division.id, "down"))}
              className="text-secondary hover:text-on-background disabled:opacity-20"
            >
              <ChevronDown size={13} />
            </button>
          </div>
          <h3 className="text-body-md font-semibold text-on-background">{division.name}</h3>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="text-secondary hover:text-on-background shrink-0">
          {editing ? <X size={13} /> : <Pencil size={13} />}
        </button>
      </div>

      {!editing && (
        <div className="flex flex-wrap gap-1 mt-2">
          {division.grantsFullAdminAccess && (
            <span className="text-label-caps uppercase bg-primary-container/10 text-primary-container px-2 py-0.5 rounded">
              Akses Admin Penuh
            </span>
          )}
          {division.adminModuleScope.map((s) => (
            <span key={s} className="text-label-caps uppercase bg-surface-container-lowest text-on-surface-variant px-2 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      )}

      {editing && (
        <form
          action={(fd) => {
            updateDepartment(division.id, fd);
            setEditing(false);
          }}
          className="flex flex-col gap-2 mt-2"
        >
          <input name="name" defaultValue={division.name} className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
          <textarea
            name="description"
            defaultValue={division.description ?? ""}
            rows={2}
            className="bg-surface-container-lowest rounded-md p-2 text-body-md resize-none"
          />
          <AccessFields dept={division} />
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase px-3 py-1.5 rounded-md hover:bg-primary transition-colors"
          >
            Simpan
          </button>
        </form>
      )}
    </div>
  );
}

function AddForm({ parentDepartmentId, onDone }: { parentDepartmentId: string | null; onDone: () => void }) {
  return (
    <form
      action={(fd) => {
        createDepartment(fd);
        onDone();
      }}
      className="flex flex-col gap-2 mt-3 bg-surface-container-low rounded-lg p-4"
    >
      <input type="hidden" name="parentDepartmentId" value={parentDepartmentId ?? ""} />
      <input name="name" placeholder="Nama" required className="bg-surface-container-lowest rounded-md p-2 text-body-md" />
      <textarea
        name="description"
        placeholder="Deskripsi (opsional)"
        rows={2}
        className="bg-surface-container-lowest rounded-md p-2 text-body-md resize-none"
      />
      <button
        type="submit"
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase px-4 py-2 rounded-md hover:bg-primary transition-colors"
      >
        Tambah
      </button>
    </form>
  );
}
