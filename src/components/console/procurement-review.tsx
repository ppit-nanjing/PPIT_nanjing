"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { reviewProcurement } from "@/app/actions/procurement";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";

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

const STATUS_LABEL: Record<Request["status"], string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  fulfilled: "Terpenuhi",
};

const STATUS_TONE: Record<Request["status"], BadgeTone> = {
  pending: "info",
  approved: "info",
  rejected: "danger",
  fulfilled: "success",
};

export function ProcurementReview({ requests }: { requests: Request[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <CollapsibleRecordList
      records={requests}
      countLabel={(n) => `${n} usulan`}
      emptyText="Belum ada usulan pengadaan."
      defaultOpen={(r) => r.status === "pending"}
      renderSummary={(r) => ({
        title: r.itemName,
        subtitle: [
          `Urgensi: ${r.urgency}`,
          r.estimatedCost != null ? `~RMB ${r.estimatedCost}` : null,
          r.userName ? `oleh ${r.userName}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        badge: { text: STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] },
      })}
      renderDetail={(r) => (
        <form
          action={(fd) =>
            startTransition(async () => {
              await reviewProcurement(fd);
              const decision = fd.get("decision");
              toast.success(
                decision === "approve" ? "Usulan disetujui." : decision === "reject" ? "Usulan ditolak." : "Ditandai terpenuhi.",
              );
            })
          }
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={r.id} />
          <div className="flex gap-4">
            {r.imageUrl && (
              <Image
                src={r.imageUrl}
                alt={r.itemName}
                width={96}
                height={96}
                className="h-24 w-24 shrink-0 rounded-md border border-outline-variant object-cover"
              />
            )}
            <div className="min-w-0 text-label-caps text-on-surface-variant">
              <p>
                Urgensi: <span className="text-on-background normal-case">{r.urgency}</span>
                {r.estimatedCost != null ? ` · ~RMB ${r.estimatedCost}` : ""}
                {r.category ? ` · ${r.category}` : ""}
              </p>
              {r.userName && (
                <p>
                  Diusulkan oleh: <span className="text-on-background normal-case">{r.userName}</span>
                </p>
              )}
              {r.justification && <p className="mt-1 text-body-md normal-case text-on-surface-variant">{r.justification}</p>}
            </div>
          </div>

          {(r.status === "pending" || r.status === "approved") && (
            <div className="flex flex-wrap gap-3">
              {r.status === "pending" && (
                <>
                  <button
                    type="submit"
                    name="decision"
                    value="approve"
                    disabled={pending}
                    className="rounded-md bg-primary-container px-5 py-2.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary disabled:opacity-60 motion-reduce:transition-none"
                  >
                    Setujui
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="reject"
                    disabled={pending}
                    className="rounded-md border border-outline-variant px-5 py-2.5 text-label-caps uppercase tracking-wide text-secondary transition-colors hover:text-on-background disabled:opacity-60 motion-reduce:transition-none"
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
                  className="rounded-md bg-primary-container px-5 py-2.5 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary disabled:opacity-60 motion-reduce:transition-none"
                >
                  Tandai Terpenuhi
                </button>
              )}
            </div>
          )}
        </form>
      )}
    />
  );
}
