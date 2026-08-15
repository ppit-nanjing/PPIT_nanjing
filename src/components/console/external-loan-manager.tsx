"use client";

import { useTransition } from "react";
import { recordExternalLoan, returnExternalLoan } from "@/app/actions/admin-inventory";

const CONDITIONS = [
  { value: "new", label: "Baru" },
  { value: "good", label: "Baik" },
  { value: "fair", label: "Cukup Baik" },
  { value: "damaged", label: "Rusak" },
  { value: "retired", label: "Pensiun" },
];

type Item = { id: string; name: string; availableQuantity: number };
type Loan = {
  id: string;
  itemName: string;
  borrowerName: string;
  borrowerContact: string | null;
  quantity: number;
  conditionOut: string | null;
  loanedAt: string;
  expectedReturnAt: string | null;
};

export function ExternalLoanManager({ items, loans }: { items: Item[]; loans: Loan[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <form
        action={(fd) => startTransition(() => recordExternalLoan(fd))}
        className="bg-surface-container-low border border-outline-variant rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <h3 className="text-headline-md text-on-background md:col-span-2">Catat Peminjaman Keluar</h3>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Barang *</span>
          <select name="itemId" required className="bg-soft-gray rounded-md p-3 text-body-md">
            <option value="">Pilih barang</option>
            {items.map((i) => (
              <option key={i.id} value={i.id} disabled={i.availableQuantity < 1}>
                {i.name} ({i.availableQuantity} tersedia)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Nama Peminjam *</span>
          <input name="borrowerName" required className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kontak Peminjam</span>
          <input name="borrowerContact" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jumlah</span>
          <input type="number" min={1} name="quantity" defaultValue={1} className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Kondisi Saat Keluar</span>
          <select name="conditionOut" defaultValue="good" className="bg-soft-gray rounded-md p-3 text-body-md">
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Perkiraan Tanggal Kembali</span>
          <input type="date" name="expectedReturnAt" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Tujuan / Keterangan</span>
          <input name="purpose" className="bg-soft-gray rounded-md p-3 text-body-md" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="md:col-span-2 self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Catat Peminjaman"}
        </button>
      </form>

      <div className="flex flex-col gap-4">
        {loans.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">Belum ada peminjaman keluar.</p>
        ) : (
          loans.map((l) => (
            <form
              key={l.id}
              action={(fd) => startTransition(() => returnExternalLoan(fd))}
              className="bg-surface-container-low border border-outline-variant rounded-lg p-5 flex flex-col gap-3"
            >
              <input type="hidden" name="loanId" value={l.id} />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-body-md font-semibold text-on-background">{l.itemName}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {l.borrowerName}
                    {l.borrowerContact ? ` (${l.borrowerContact})` : ""} &middot; {l.quantity} unit &middot; keluar{" "}
                    {new Date(l.loanedAt).toLocaleDateString("id-ID")}
                  </p>
                  {l.expectedReturnAt && (
                    <p className="text-label-caps text-on-surface-variant">
                      Perkiraan kembali: {new Date(l.expectedReturnAt).toLocaleDateString("id-ID")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <select name="conditionIn" defaultValue="" className="bg-soft-gray rounded-md p-2.5 text-body-md">
                    <option value="">Kondisi saat kembali</option>
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={pending}
                    className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
                  >
                    Tandai Kembali
                  </button>
                </div>
              </div>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
