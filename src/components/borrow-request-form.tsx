"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Info, Send } from "lucide-react";
import { submitBorrowRequest } from "@/app/actions/inventory";

const STEPS = ["Detail Peminjaman", "Pengambilan & Persetujuan"] as const;

export function BorrowRequestForm({
  itemId,
  maxQuantity,
  itemLocation,
}: {
  itemId: string;
  maxQuantity: number;
  itemLocation: string | null;
}) {
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [agreed, setAgreed] = useState(false);

  const detailsValid = Number(quantity) >= 1 && !!requestedFrom && !!requestedTo && purpose.trim().length > 0;

  return (
    <form action={submitBorrowRequest.bind(null, itemId)} className="flex flex-col gap-6">
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="requestedFrom" value={requestedFrom} />
      <input type="hidden" name="requestedTo" value={requestedTo} />
      <input type="hidden" name="purpose" value={purpose} />

      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-colors ${i <= step ? "bg-primary-container" : "bg-surface-container-low"}`} />
            <span className={`text-label-caps ${i === step ? "text-on-background font-medium" : "text-on-surface-variant"}`}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Jumlah *</span>
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Dari Tanggal *</span>
              <input
                type="date"
                value={requestedFrom}
                onChange={(e) => setRequestedFrom(e.target.value)}
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Sampai Tanggal *</span>
              <input
                type="date"
                value={requestedTo}
                onChange={(e) => setRequestedTo(e.target.value)}
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Keperluan *</span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              required
              placeholder="mis. Dokumentasi acara Sumpah Pemuda"
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!detailsValid}
              onClick={() => setStep(1)}
              className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-40"
            >
              Selanjutnya <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          {itemLocation && (
            <div className="flex items-start gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-5">
              <Info className="text-primary-container shrink-0 mt-0.5" size={18} />
              <p className="text-body-md text-on-surface-variant">
                Barang ini tersimpan di <span className="font-semibold text-on-background">{itemLocation}</span>.
                Pengambilan dan pengembalian dilakukan di lokasi tersebut.
              </p>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[var(--color-primary-container)]"
            />
            <span className="text-body-md text-on-surface-variant">
              Saya bertanggung jawab penuh atas barang yang dipinjam dan memahami bahwa kerusakan
              atau kehilangan menjadi tanggung jawab peminjam.
            </span>
          </label>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background transition-colors"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            <button
              type="submit"
              disabled={!agreed}
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-40"
            >
              Kirim Pengajuan <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
