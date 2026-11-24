"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw, Hand, PackageCheck, MapPin, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
  markHandedOver,
  markReturned,
  correctBorrowStatus,
} from "@/app/actions/admin-inventory";
import { ProofView } from "@/components/console/proof-view";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";
import { ConfirmButton } from "@/components/console/confirm-button";
import { Select } from "@/components/console/form";
import {
  BORROW_HOLDS_STOCK,
  BORROW_STATUSES,
  BORROW_STATUS_LABEL as STATUS_LABEL,
  type BorrowStatus,
} from "@/lib/inventory-labels";

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
  status: BorrowStatus;
  requestedFrom: string | null;
  requestedTo: string | null;
  returnRequestedAt: string | null;
}

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
  // Penolakan butuh alasan: formulir kecil di baris yang bersangkutan, bukan satu klik.
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<unknown>, done?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        if (done) toast.success(done);
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
          {/* Siapa, apa, dan kapan harus terlihat di tempat keputusan diambil (subjudul
              baris tertutup hilang begitu baris dibuka). */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
            <dt className="text-on-surface-variant">Peminjam</dt>
            <dd className="min-w-0 break-words text-on-background">
              {r.userName ?? r.borrowerName ?? "Anonim"}
              {r.userEmail && <span className="text-on-surface-variant"> · {r.userEmail}</span>}
            </dd>
            <dt className="text-on-surface-variant">Barang</dt>
            <dd className="text-on-background">
              {r.itemName} × {r.quantity}
            </dd>
            <dt className="text-on-surface-variant">Periode</dt>
            <dd className="text-on-background">
              {r.requestedFrom ?? "?"} – {r.requestedTo ?? "?"}
            </dd>
          </dl>
          {r.borrowerName && (
            <p className="text-body-sm text-on-surface-variant break-all">
              Pihak luar ·{" "}
              {[r.borrowerEmail, r.borrowerWechat && `WeChat: ${r.borrowerWechat}`, r.borrowerPhone]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {r.purpose && <p className="text-body-md text-on-surface-variant">{r.purpose}</p>}
          <div className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
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

          {r.status === "pending" &&
            (rejectId === r.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Server menolak alasan < 3 huruf dengan error, tapi di produksi pesan error server
                  // tidak sampai ke layar (diganti pesan umum), jadi periksa dulu di sini.
                  if (!r.borrowerName && reason.trim().length < 3) {
                    setError("Tulis alasan penolakan supaya peminjam tahu kenapa.");
                    return;
                  }
                  run(async () => {
                    await rejectBorrowRequest(r.id, reason);
                    setRejectId(null);
                    setReason("");
                  }, r.borrowerName ? "Pengajuan ditolak." : "Pengajuan ditolak. Peminjam diberi tahu lewat notifikasi.");
                }}
                className="flex flex-col gap-2 rounded-md border border-error/40 p-3"
              >
                <label className="flex flex-col gap-1">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Alasan penolakan</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    maxLength={300}
                    required={!r.borrowerName}
                    autoFocus
                    placeholder="mis. Barang dipakai acara lain pada tanggal itu"
                    className="w-full rounded-md bg-soft-gray p-2.5 text-body-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                  />
                </label>
                <p className="text-body-sm text-on-surface-variant">
                  {r.borrowerName
                    ? "Peminjam luar tidak punya akun, jadi sampaikan alasannya sendiri."
                    : "Alasan ini dikirim ke peminjam lewat notifikasi."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-md bg-error-container px-3 py-2 text-label-caps text-on-error-container transition-opacity hover:opacity-80 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <X size={14} /> Tolak pengajuan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectId(null);
                      setReason("");
                    }}
                    className="rounded-md border border-outline-variant px-3 py-2 text-label-caps text-on-surface-variant transition-colors hover:text-on-background"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={isPending}
                  onClick={() => run(() => approveBorrowRequest(r.id), "Pengajuan disetujui.")}
                  className="flex items-center gap-1 rounded-md bg-primary-container/10 px-3 py-2 text-label-caps text-primary-container transition-colors hover:bg-primary-container/20 disabled:opacity-50 motion-reduce:transition-none"
                >
                  <Check size={14} /> Setujui
                </button>
                <button
                  disabled={isPending}
                  onClick={() => {
                    setRejectId(r.id);
                    setReason("");
                  }}
                  className="flex items-center gap-1 rounded-md bg-error-container px-3 py-2 text-label-caps text-on-error-container transition-opacity hover:opacity-80 disabled:opacity-50 motion-reduce:transition-none"
                >
                  <X size={14} /> Tolak…
                </button>
              </div>
            ))}
          {r.status === "approved" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={isPending}
                onClick={() => run(() => markHandedOver(r.id), "Barang ditandai dipinjam.")}
                className="flex items-center gap-1 rounded-md bg-primary-container/10 px-3 py-1.5 text-label-caps text-primary-container transition-colors hover:bg-primary-container/20 disabled:opacity-50 motion-reduce:transition-none"
              >
                <Hand size={14} /> Serahkan Barang (Tandai Dipinjam)
              </button>
              <button
                disabled={isPending}
                onClick={() => run(() => markReturned(r.id), "Pengembalian dicatat.")}
                className="flex items-center gap-1 text-label-caps text-on-surface-variant transition-colors hover:text-primary-container disabled:opacity-50 motion-reduce:transition-none"
              >
                <RotateCcw size={14} /> Batalkan / Langsung Dikembalikan
              </button>
            </div>
          )}
          {(r.status === "borrowed" || r.status === "overdue") && (
            <button
              disabled={isPending}
              onClick={() => run(() => markReturned(r.id), "Pengembalian dicatat.")}
              className={`flex w-fit items-center gap-1 rounded-md px-3 py-1.5 text-label-caps transition-colors disabled:opacity-50 motion-reduce:transition-none ${
                wantsReturn(r) ? "bg-primary-container text-on-primary hover:bg-primary" : "text-primary-container hover:text-primary"
              }`}
            >
              <RotateCcw size={14} />
              {wantsReturn(r) ? "Konfirmasi Pengembalian" : "Tandai Dikembalikan"}
            </button>
          )}
          {r.status === "returned" && (
            <p className="text-label-caps text-on-surface-variant">Selesai - barang kembali ke stok.</p>
          )}
          {r.status === "rejected" && <p className="text-label-caps text-on-surface-variant">Pengajuan ditolak.</p>}
          <StatusCorrection request={r} />
        </>
      )}
    />
  );
}

// Jalan keluar untuk salah klik: ubah status ke apa saja. Disembunyikan di
// balik <details> supaya tidak ikut terklik saat memproses antrean.
function StatusCorrection({ request: r }: { request: Request }) {
  const [next, setNext] = useState<BorrowStatus>(r.status);
  const holds = (s: BorrowStatus) => BORROW_HOLDS_STOCK.includes(s);
  const stock =
    holds(r.status) === holds(next)
      ? "Stok tersedia tidak berubah."
      : holds(next)
        ? `Stok tersedia berkurang ${r.quantity}.`
        : `Stok tersedia bertambah ${r.quantity}.`;

  return (
    <details className="border-t border-outline-variant pt-3">
      <summary className="w-fit cursor-pointer text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-primary-container">
        Koreksi status…
      </summary>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Status baru"
          value={next}
          onChange={(e) => setNext(e.target.value as BorrowStatus)}
          className="w-auto"
        >
          {BORROW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        {next !== r.status && (
          <ConfirmButton
            danger={false}
            title="Koreksi status"
            message={`Ubah status dari ${STATUS_LABEL[r.status]} ke ${STATUS_LABEL[next]}? ${stock} Peminjam tidak diberi notifikasi.`}
            confirmLabel="Ya, ubah"
            successMessage="Status dikoreksi."
            onConfirm={async () => {
              const res = await correctBorrowStatus(r.id, next);
              if (res.error) throw new Error(res.error);
            }}
            className="rounded-md bg-primary-container/10 px-3 py-2 text-label-caps text-primary-container transition-colors hover:bg-primary-container/20 motion-reduce:transition-none"
          >
            Ubah status
          </ConfirmButton>
        )}
      </div>
      <p className="mt-2 text-body-sm text-on-surface-variant">
        Untuk memperbaiki salah klik. Pilih Terlambat bila tanggal kembali sudah lewat.
      </p>
    </details>
  );
}
