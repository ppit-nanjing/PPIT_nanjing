"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvitedUser } from "@/app/actions/admin-users";

export function InviteUserForm({
  roles,
  departments,
}: {
  roles: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createInvitedUser(fd);
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengundang");
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-5 mb-8">
        <p className="text-body-md text-on-background">
          Undangan dibuat. Akun berstatus &quot;Diundang&quot; - orang tersebut akan aktif setelah pertama kali masuk
          (Google atau daftar kata sandi) dengan email yang sama.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <h3 className="text-headline-md text-on-background md:col-span-2">Undang Pengguna</h3>
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama *</span>
        <input name="name" required className="bg-soft-gray rounded-md p-3 text-body-md" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Email *</span>
        <input name="email" type="email" required className="bg-soft-gray rounded-md p-3 text-body-md" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Role</span>
        <select name="roleId" defaultValue="" className="bg-soft-gray rounded-md p-3 text-body-md">
          <option value="">— Belum ada —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Divisi</span>
        <select name="departmentId" defaultValue="" className="bg-soft-gray rounded-md p-3 text-body-md">
          <option value="">— Belum ada —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 md:col-span-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Posisi di Divisi</span>
        <input name="position" className="bg-soft-gray rounded-md p-3 text-body-md" />
      </label>
      {error && <p className="text-body-sm text-error md:col-span-2">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="md:col-span-2 self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        {pending ? "Mengundang..." : "Buat Undangan"}
      </button>
    </form>
  );
}
