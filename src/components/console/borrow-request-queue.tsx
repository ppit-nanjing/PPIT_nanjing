"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw, Hand, PackageCheck, MapPin, TriangleAlert } from "lucide-react";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
  markHandedOver,
  markReturned,
} from "@/app/actions/admin-inventory";
import { ProofView } from "@/components/console/proof-view";

interface Request {
  id: string;
  itemName: string;
  userName: string | null;
  userEmail: string | null;
  // Peminjam eksternal (pihak luar tanpa akun) - null untuk peminjam internal.
  borrowerName: string | null;
  borrowerEmail: string | null;
  borrowerWechat: string | null;
  borrowerPhone: string | null;
  quantity: number;
  purpose: string | null;
  usageLocation: string | null;
  statementUrl: string | null;
  status: "pending" | "approved" | "rejected" | "borrowed" | "returned" | "overdue";
  requestedFrom: string | null;
  requestedTo: string | null;
  returnRequestedAt: string | null;
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aksi gagal. Muat ulang halaman lalu coba lagi.");
      }
    });
  }

  if (requests.length === 0) {
    return <p className="text-body-md text-on-surface-variant">Belum ada pengajuan peminjaman.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
          <TriangleAlert size={16} aria-hidden /> {error}
        </p>
      )}
      {requests.map((r) => {
        const isActive = r.status === "approved" || r.status === "borrowed" || r.status === "overdue";
        const hasReturnRequest = Boolean(r.returnRequestedAt) && (r.status === "borrowed" || r.status === "overdue");
        return (
          <div
            key={r.id}
            className={`rounded-lg p-5 border ${hasReturnRequest ? "border-primary-container bg-primary-container/5" : "bg-surface-container-lowest border-outline-variant"}`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0">
                <p className="text-body-md font-medium text-on-background">
                  {r.itemName} &times; {r.quantity}
                </p>
                <p className="text-label-caps text-on-surface-variant">
                  {r.userName ?? r.borrowerName ?? r.userEmail ?? "Anonim"} &middot; {r.requestedFrom} &ndash; {r.requestedTo}
                </p>
                {r.borrowerName && (
                  <p className="text-label-caps text-on-surface-variant break-all">
                    Pihak luar &middot; {[r.borrowerEmail, r.borrowerWechat && `WeChat: ${r.borrowerWechat}`, r.borrowerPhone].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2.5 py-1 rounded shrink-0">
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            {r.purpose && <p className="text-body-md text-on-surface-variant mb-2">{r.purpose}</p>}
            <div className="mb-3 flex flex-col gap-1 text-label-caps text-on-surface-variant">
              {r.usageLocation && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden /> Lokasi pakai: <span className="normal-case text-on-background">{r.usageLocation}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                Pernyataan Peminjam: <ProofView url={r.statementUrl} label="Pernyataan Peminjam" />
              </span>
            </div>

            {hasReturnRequest && (
              <p className="flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container mb-3">
                <PackageCheck size={14} /> Peminjam mengajukan pengembalian
              </p>
            )}

            {r.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={isPending}
                  onClick={() => run(() => approveBorrowRequest(r.id))}
                  className="flex items-center gap-1 text-label-caps bg-primary-container/10 text-primary-container px-3 py-1.5 rounded-md hover:bg-primary-container/20 transition-colors disabled:opacity-50"
                >
                  <Check size={14} /> Setujui
                </button>
                <button
                  disabled={isPending}
                  onClick={() => run(() => rejectBorrowRequest(r.id))}
                  className="flex items-center gap-1 text-label-caps bg-error-container text-on-error-container px-3 py-1.5 rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  <X size={14} /> Tolak
                </button>
              </div>
            )}
            {r.status === "approved" && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={isPending}
                  onClick={() => run(() => markHandedOver(r.id))}
                  className="flex items-center gap-1 text-label-caps bg-primary-container/10 text-primary-container px-3 py-1.5 rounded-md hover:bg-primary-container/20 transition-colors disabled:opacity-50"
                >
                  <Hand size={14} /> Serahkan Barang (Tandai Dipinjam)
                </button>
                <button
                  disabled={isPending}
                  onClick={() => run(() => markReturned(r.id))}
                  className="flex items-center gap-1 text-label-caps text-on-surface-variant hover:text-primary-container transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={14} /> Batalkan / Langsung Dikembalikan
                </button>
              </div>
            )}
            {(r.status === "borrowed" || r.status === "overdue") && (
              <button
                disabled={isPending}
                onClick={() => run(() => markReturned(r.id))}
                className={`flex items-center gap-1 text-label-caps px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${hasReturnRequest ? "bg-primary-container text-on-primary hover:bg-primary" : "text-primary-container hover:text-primary"}`}
              >
                <RotateCcw size={14} />
                {hasReturnRequest ? "Konfirmasi Pengembalian" : "Tandai Dikembalikan"}
              </button>
            )}
            {!isActive && r.status !== "pending" && (
              <p className="text-label-caps text-on-surface-variant/70">
                {r.status === "returned" ? "Selesai - barang kembali ke stok." : "Pengajuan ditolak."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
