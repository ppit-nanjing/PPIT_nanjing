"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Info, Send } from "lucide-react";
import { submitBorrowRequest } from "@/app/actions/inventory";
import { useT } from "@/lib/i18n/client";
import { FileUpload } from "@/components/upload/file-upload";

const STEPS = ["inventory.form.stepDetails", "inventory.form.stepStatement"] as const;

export function BorrowRequestForm({
  itemId,
  maxQuantity,
  itemLocation,
}: {
  itemId: string;
  maxQuantity: number;
  itemLocation: string | null;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [usageLocation, setUsageLocation] = useState("");

  const detailsValid =
    Number(quantity) >= 1 &&
    !!requestedFrom &&
    !!requestedTo &&
    purpose.trim().length > 0 &&
    usageLocation.trim().length > 0;

  return (
    <form action={submitBorrowRequest.bind(null, itemId)} className="flex flex-col gap-6">
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="requestedFrom" value={requestedFrom} />
      <input type="hidden" name="requestedTo" value={requestedTo} />
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="usageLocation" value={usageLocation} />

      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-colors ${i <= step ? "bg-primary-container" : "bg-surface-container-low"}`} />
            <span className={`text-label-caps ${i === step ? "text-on-background font-medium" : "text-on-surface-variant"}`}>{t(s)}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.quantity")} *</span>
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
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.fromDate")} *</span>
              <input
                type="date"
                value={requestedFrom}
                onChange={(e) => setRequestedFrom(e.target.value)}
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.toDate")} *</span>
              <input
                type="date"
                value={requestedTo}
                min={requestedFrom || undefined}
                onChange={(e) => setRequestedTo(e.target.value)}
                required
                className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.purpose")} *</span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              required
              placeholder={t("inventory.form.purposePlaceholder")}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.usageLocation")} *</span>
            <input
              value={usageLocation}
              onChange={(e) => setUsageLocation(e.target.value)}
              required
              placeholder={t("inventory.form.usageLocationPlaceholder")}
              className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!detailsValid}
              onClick={() => setStep(1)}
              className="flex items-center gap-1 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-40"
            >
              {t("inventory.form.next")} <ChevronRight size={16} />
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
                {t("inventory.form.locationNote", { location: itemLocation })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-body-md text-on-surface-variant">{t("inventory.form.statementIntro")}</p>
            <a
              href="/pernyataan-peminjam.docx"
              download
              className="self-start inline-flex items-center gap-2 border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-surface-container-low transition-colors"
            >
              <Download size={15} aria-hidden /> {t("inventory.form.statementDownload")}
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              {t("inventory.form.statementUpload")} *
            </span>
            {/* FileUpload menulis URL hasil unggah ke input bernama `statementUrl`
                dan menandainya `required` selama belum ada berkas, jadi browser
                menolak submit tanpa berkas. Server memvalidasi ulang. */}
            <FileUpload
              name="statementUrl"
              folder="borrow-doc"
              required
              autoUpload
              accept="application/pdf,.doc,.docx,image/*"
              hint={t("inventory.form.statementHint")}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1 text-label-caps text-secondary hover:text-on-background transition-colors"
            >
              <ChevronLeft size={16} /> {t("inventory.form.previous")}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-40"
            >
              {t("inventory.form.submit")} <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
