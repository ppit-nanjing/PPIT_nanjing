"use client";

import { useTransition } from "react";
import { reviewContribution } from "@/app/actions/contributions";
import { Select } from "@/components/console/form";

type Contribution = {
  id: string;
  name: string;
  category: string | null;
  condition: string;
  contributionType: "donate" | "lend_to_org";
  userName: string | null;
  userEmail: string | null;
};

export function ContributionReview({
  contributions,
  items,
}: {
  contributions: Contribution[];
  items: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  if (contributions.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada pengajuan sumbangan/pinjaman.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {contributions.map((c) => (
        <form
          key={c.id}
          action={(fd) => startTransition(() => reviewContribution(fd))}
          className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={c.id} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-body-md font-semibold text-on-background">{c.name}</p>
              <p className="text-label-caps text-on-surface-variant">
                {c.contributionType === "donate" ? "Sumbangan" : "Pinjamkan"} &middot; Kondisi: {c.condition}
                {c.category ? ` &middot; ${c.category}` : ""}
              </p>
              {c.userName && (
                <p className="text-label-caps text-on-surface-variant">
                  {c.userName} ({c.userEmail})
                </p>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Gabung ke barang existing (kosongkan = buat barang baru)
            </span>
            <Select name="existingItemId" defaultValue="" className="w-full">
              <option value="">— Barang baru —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="decision"
              value="approve"
              disabled={pending}
              className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
            >
              Setujui
            </button>
            <button
              type="submit"
              name="decision"
              value="reject"
              disabled={pending}
              className="text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md border border-outline-variant text-secondary hover:text-on-background transition-colors disabled:opacity-60"
            >
              Tolak
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
