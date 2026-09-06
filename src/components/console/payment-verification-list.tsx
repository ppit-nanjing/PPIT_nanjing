"use client";

import { updatePaymentStatus } from "@/app/actions/committee";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-status-labels";
import { ProofView } from "@/components/console/proof-view";
import { Select } from "@/components/console/form";
import { CollapsibleRecordList, type BadgeTone } from "@/components/console/collapsible-record-list";

export interface PaymentRow {
  id: string;
  status: string;
  proofUrl: string | null;
  note: string | null;
  registeredAt: string;
  name: string | null;
  email: string | null;
  expected: number | null;
  feeLabel: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  unpaid: "neutral",
  submitted: "info",
  verified: "success",
  rejected: "danger",
};

const STATUS_OPTIONS = [
  { value: "unpaid", label: "Belum Bayar" },
  { value: "submitted", label: "Menunggu Verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

export function PaymentVerificationList({ payments }: { payments: PaymentRow[] }) {
  return (
    <CollapsibleRecordList
      records={payments}
      countLabel={(n) => `${n} peserta`}
      emptyText="Belum ada laporan pembayaran."
      // Baris yang masih "Menunggu Verifikasi" dibuka — itu yang perlu ditindak.
      defaultOpen={(p) => p.status === "submitted"}
      renderSummary={(p) => ({
        title: p.name ?? "(tanpa nama)",
        badge: {
          text: PAYMENT_STATUS_LABEL[p.status] ?? p.status,
          tone: STATUS_TONE[p.status] ?? "neutral",
        },
      })}
      renderDetail={(p) => (
        <>
          <div className="flex flex-col gap-0.5 text-label-caps text-on-surface-variant">
            {p.email && <span className="break-all normal-case">{p.email}</span>}
            {(p.expected != null || p.feeLabel) && (
              <span>
                Wajib bayar:{" "}
                <span className="text-on-background normal-case">
                  {p.expected != null ? `¥${p.expected}` : "—"}
                  {p.feeLabel ? ` · ${p.feeLabel}` : ""}
                </span>
              </span>
            )}
            <span>
              Daftar:{" "}
              <span className="text-on-background normal-case">
                {new Date(p.registeredAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </span>
          </div>

          {p.proofUrl && (
            <div className="text-label-caps">
              <ProofView url={p.proofUrl} label="Bukti transfer" />
            </div>
          )}

          <form action={updatePaymentStatus} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input
              name="note"
              defaultValue={p.note ?? ""}
              placeholder="Catatan (opsional)"
              className="w-full rounded-md bg-soft-gray p-2 text-body-md"
            />
            <div className="flex items-center gap-2">
              <Select
                name="paymentStatus"
                defaultValue={p.status}
                className="min-w-0 flex-1"
                aria-label="Status pembayaran"
                options={STATUS_OPTIONS}
              />
              <button
                type="submit"
                className="rounded-md bg-primary-container px-4 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary motion-reduce:transition-none"
              >
                Simpan
              </button>
            </div>
          </form>
        </>
      )}
    />
  );
}
