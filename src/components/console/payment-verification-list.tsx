"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { updatePaymentStatus } from "@/app/actions/committee";
import { PAYMENT_STATUS_LABEL } from "@/lib/payment-status-labels";
import { ProofView } from "@/components/console/proof-view";
import { Select } from "@/components/console/form";

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

// Butuh perhatian bendahara = warna menyala; sisanya tenang.
const STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-surface-container-low text-on-surface-variant",
  submitted: "bg-primary-container/15 text-primary-container",
  verified: "bg-primary-container/10 text-primary-container",
  rejected: "bg-error-container/50 text-on-error-container",
};

const STATUS_OPTIONS = [
  { value: "unpaid", label: "Belum Bayar" },
  { value: "submitted", label: "Menunggu Verifikasi" },
  { value: "verified", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

export function PaymentVerificationList({ payments }: { payments: PaymentRow[] }) {
  // Default: baris yang masih "Menunggu Verifikasi" dibuka (itu yang butuh
  // ditindak); yang lain tertutup, cukup lihat nama + statusnya.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(payments.filter((p) => p.status === "submitted").map((p) => p.id)),
  );

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = payments.length > 0 && payments.every((p) => open.has(p.id));

  if (payments.length === 0) {
    return <p className="py-2 text-body-md text-on-surface-variant">Belum ada laporan pembayaran.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant">{payments.length} peserta</p>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(payments.map((p) => p.id)))}
          className="text-label-caps uppercase tracking-wide text-primary-container transition-colors hover:text-primary"
        >
          {allOpen ? "Tutup semua" : "Buka semua"}
        </button>
      </div>

      <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {payments.map((p) => {
          const isOpen = open.has(p.id);
          return (
            <li key={p.id} className="border-b border-outline-variant/60 last:border-0">
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low/60"
              >
                <ChevronRight
                  size={16}
                  aria-hidden
                  className={`shrink-0 text-on-surface-variant transition-transform motion-reduce:transition-none ${isOpen ? "rotate-90" : ""}`}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-on-background">
                  {p.name ?? "(tanpa nama)"}
                </span>
                <span
                  className={`shrink-0 rounded px-2 py-1 text-label-caps uppercase tracking-wide ${STATUS_STYLE[p.status] ?? "bg-surface-container-low text-on-surface-variant"}`}
                >
                  {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-2 px-4 pb-4 pl-11">
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
                        className="flex-1"
                        aria-label="Status pembayaran"
                        options={STATUS_OPTIONS}
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-primary-container px-4 py-2 text-label-caps uppercase tracking-wide text-on-primary transition-colors hover:bg-primary"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
