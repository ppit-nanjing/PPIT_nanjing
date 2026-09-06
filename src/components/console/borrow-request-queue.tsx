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
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";

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

const STATUS_TONE: Record<Request["status"], BadgeTone> = {
  pending: "info",
  approved: "info",
  rejected: "danger",
  borrowed: "neutral",
  returned: "success",
  overdue: "warning",
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

  const wantsReturn = (r: Request) =>
    Boolean(r.returnRequestedAt) && (r.status === "borrowed" || r.status === "overdue");

  return (
    <CollapsibleRecordList
      records={requests}
      countLabel={(n) => `${n} pengajuan`}
      emptyText="Belum ada pengajuan peminjaman."
      defaultOpen={(r) => r.status === "pending" || wantsReturn(r)}
      banner={
        error ? (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-error-container/40 px-4 py-3 text-body-md text-on-error-container">
            <TriangleAlert size={16} aria-hidden /> {error}
          </p>
        ) : null
      }
      renderSummary={(r) => ({
        title: `${r.itemName} × ${r.quantity}`,
        subtitle: `${r.userName ?? r.borrowerName ?? r.userEmail ?? "Anonim"} · ${r.requestedFrom ?? "?"} – ${r.requestedTo ?? "?"}`,
        badge: wantsReturn(r)
          ? { text: "Minta Kembali", tone: "warning" }
          : { text: STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] },
      })}
      renderDetail={(r) => (
        <>
          {r.borrowerName && (
            <p className="text-label-caps text-on-surface-variant break-all">
              Pihak luar ·{" "}
              {[r.borrowerEmail, r.borrowerWechat && `WeChat: ${r.borrowerWechat}`, r.borrowerPhone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {r.purpose && <p className="text-body-md text-on-surface-variant">{r.purpose}</p>}
          <div className="flex flex-col gap-1 text-label-caps text-on-surface-variant">
            {r.usageLocation && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} aria-hidden /> Lokasi pakai:{" "}
                <span className="normal-case text-on-background">{r.usageLocation}</span>
              </span>
            )}
            <span className="flex flex-wrap items-center gap-1.5">
              Pernyataan Peminjam: <ProofView url={r.statementUrl} label="Pernyataan Peminjam" />
            </span>
          </div>

          {wantsReturn(r) && (
            <p className="flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container">
              <PackageCheck size={14} /> Peminjam mengajukan pengembalian
            </p>
          )}

          {r.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <button
                disabled={isPending}
                onClick={() => run(() => approveBorrowRequest(r.id))}
                className="flex items-center gap-1 rounded-md bg-primary-container/10 px-3 py-1.5 text-label-caps text-primary-container transition-colors hover:bg-primary-container/20 disabled:opacity-50 motion-reduce:transition-none"
              >
                <Check size={14} /> Setujui
              </button>
              <button
                disabled={isPending}
                onClick={() => run(() => rejectBorrowRequest(r.id))}
                className="flex items-center gap-1 rounded-md bg-error-container px-3 py-1.5 text-label-caps text-on-error-container transition-opacity hover:opacity-80 disabled:opacity-50 motion-reduce:transition-none"
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
                className="flex items-center gap-1 rounded-md bg-primary-container/10 px-3 py-1.5 text-label-caps text-primary-container transition-colors hover:bg-primary-container/20 disabled:opacity-50 motion-reduce:transition-none"
              >
                <Hand size={14} /> Serahkan Barang (Tandai Dipinjam)
              </button>
              <button
                disabled={isPending}
                onClick={() => run(() => markReturned(r.id))}
                className="flex items-center gap-1 text-label-caps text-on-surface-variant transition-colors hover:text-primary-container disabled:opacity-50 motion-reduce:transition-none"
              >
                <RotateCcw size={14} /> Batalkan / Langsung Dikembalikan
              </button>
            </div>
          )}
          {(r.status === "borrowed" || r.status === "overdue") && (
            <button
              disabled={isPending}
              onClick={() => run(() => markReturned(r.id))}
              className={`flex w-fit items-center gap-1 rounded-md px-3 py-1.5 text-label-caps transition-colors disabled:opacity-50 motion-reduce:transition-none ${
                wantsReturn(r) ? "bg-primary-container text-on-primary hover:bg-primary" : "text-primary-container hover:text-primary"
              }`}
            >
              <RotateCcw size={14} />
              {wantsReturn(r) ? "Konfirmasi Pengembalian" : "Tandai Dikembalikan"}
            </button>
          )}
          {r.status === "returned" && (
            <p className="text-label-caps text-on-surface-variant/70">Selesai - barang kembali ke stok.</p>
          )}
          {r.status === "rejected" && <p className="text-label-caps text-on-surface-variant/70">Pengajuan ditolak.</p>}
        </>
      )}
    />
  );
}
