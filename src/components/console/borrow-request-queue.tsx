"use client";

import { useTransition } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { approveBorrowRequest, rejectBorrowRequest, markReturned } from "@/app/actions/admin-inventory";

interface Request {
  id: string;
  itemName: string;
  userName: string | null;
  userEmail: string | null;
  quantity: number;
  purpose: string | null;
  status: "pending" | "approved" | "rejected" | "borrowed" | "returned" | "overdue";
  requestedFrom: string | null;
  requestedTo: string | null;
}

const STATUS_LABEL: Record<Request["status"], string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  borrowed: "Dipinjam",
  returned: "Dikembalikan",
  overdue: "Terlambat",
};

export function BorrowRequestQueue({ requests }: { requests: Request[] }) {
  const [, startTransition] = useTransition();

  if (requests.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada pengajuan peminjaman.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => (
        <div key={r.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-body-md font-medium text-on-background">
                {r.itemName} &times; {r.quantity}
              </p>
              <p className="text-label-caps text-on-surface-variant">
                {r.userName ?? r.userEmail ?? "Anonim"} &middot; {r.requestedFrom} &ndash; {r.requestedTo}
              </p>
            </div>
            <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded shrink-0">
              {STATUS_LABEL[r.status]}
            </span>
          </div>
          {r.purpose && <p className="text-body-md text-on-surface-variant mb-3">{r.purpose}</p>}

          {r.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startTransition(() => approveBorrowRequest(r.id))}
                className="flex items-center gap-1 text-label-caps bg-primary-container/10 text-primary-container px-3 py-1.5 rounded-md hover:bg-primary-container/20 transition-colors"
              >
                <Check size={14} /> Setujui
              </button>
              <button
                onClick={() => startTransition(() => rejectBorrowRequest(r.id))}
                className="flex items-center gap-1 text-label-caps bg-error-container text-on-error-container px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity"
              >
                <X size={14} /> Tolak
              </button>
            </div>
          )}
          {(r.status === "approved" || r.status === "borrowed" || r.status === "overdue") && (
            <button
              onClick={() => startTransition(() => markReturned(r.id))}
              className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary"
            >
              <RotateCcw size={14} /> Tandai Dikembalikan
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
