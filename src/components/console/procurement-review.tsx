"use client";

import { useTransition } from "react";
import { reviewProcurement } from "@/app/actions/procurement";
import Image from "next/image";

type Request = {
  id: string;
  itemName: string;
  category: string | null;
  justification: string | null;
  imageUrl: string | null;
  estimatedCost: number | null;
  urgency: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  userName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  fulfilled: "Terpenuhi",
};

export function ProcurementReview({ requests }: { requests: Request[] }) {
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada usulan pengadaan.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {requests.map((r) => (
        <form
          key={r.id}
          action={(fd) => startTransition(() => reviewProcurement(fd))}
          className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={r.id} />
          <div className="flex gap-4">
            {r.imageUrl && (
              <Image
                src={r.imageUrl}
                alt={r.itemName}
                width={96}
                height={96}
                className="w-24 h-24 object-cover rounded-md border border-outline-variant shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-body-md font-semibold text-on-background">{r.itemName}</p>
              <p className="text-label-caps text-on-surface-variant">
                {STATUS_LABEL[r.status]} &middot; Urgensi: {r.urgency}
                {r.estimatedCost != null ? ` &middot; ~RMB ${r.estimatedCost}` : ""}
                {r.category ? ` &middot; ${r.category}` : ""}
              </p>
              {r.justification && <p className="text-body-md text-on-surface-variant mt-1">{r.justification}</p>}
              {r.userName && <p className="text-label-caps text-on-surface-variant">Diusulkan oleh: {r.userName}</p>}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {r.status === "pending" && (
              <>
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
              </>
            )}
            {r.status === "approved" && (
              <button
                type="submit"
                name="decision"
                value="fulfill"
                disabled={pending}
                className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
              >
                Tandai Terpenuhi
              </button>
            )}
          </div>
        </form>
      ))}
    </div>
  );
}
