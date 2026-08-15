"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProcurementRequest } from "@/app/actions/procurement";

const URGENCY = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
];

export function ProcurementForm({ categories }: { categories: string[] }) {
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
        await createProcurementRequest(fd);
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim");
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 bg-primary-container/10 border border-primary-container/20 rounded-lg p-5">
        <p className="text-body-md text-on-background">
          Usulan pengadaan terkirim. Admin akan meninjau dan mengabari kamu lewat notifikasi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xl">
      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Barang *</span>
        <input name="itemName" required className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kategori</span>
        <input
          name="category"
          list="procurement-categories"
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
        <datalist id="procurement-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Alasan / Justifikasi</span>
        <textarea name="justification" rows={3} className="bg-soft-gray rounded-md p-3 text-body-md resize-none" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Perkiraan Biaya (RMB, opsional)</span>
        <input type="number" min={0} name="estimatedCost" placeholder="contoh: 350" className="bg-soft-gray rounded-md p-3 text-body-md" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tingkat Urgensi</span>
        <select name="urgency" defaultValue="medium" className="bg-soft-gray rounded-md p-3 text-body-md">
          {URGENCY.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-body-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Kirim Usulan"}
      </button>
    </form>
  );
}
