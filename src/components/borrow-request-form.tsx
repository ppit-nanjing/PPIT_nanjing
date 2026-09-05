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
  external = false,
}: {
  itemId: string;
  maxQuantity: number;
  itemLocation: string | null;
  external?: boolean;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [requestedFrom, setRequestedFrom] = useState("");
  const [requestedTo, setRequestedTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [usageLocation, setUsageLocation] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", wechat: "", phone: "" });

  const contactValid =
    !external ||
    (contact.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && contact.wechat.trim() && contact.phone.trim());

  // Jumlah tidak boleh melebihi stok yang tersedia — dicek di sini juga, bukan
  // cuma lewat atribut `max` (yang tidak jalan karena nilainya dikirim lewat
  // input hidden). Server tetap memvalidasi ulang.
  const qtyNum = Number(quantity);
  const qtyError =
    !Number.isInteger(qtyNum) || qtyNum < 1
      ? t("inventory.form.quantityInvalid")
      : qtyNum > maxQuantity
        ? t("inventory.form.quantityExceeds", { count: maxQuantity })
        : null;

  const detailsValid =
    !!contactValid &&
    !qtyError &&
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
      {external && (
        <>
          <input type="hidden" name="borrowerName" value={contact.name} />
          <input type="hidden" name="borrowerEmail" value={contact.email} />
          <input type="hidden" name="borrowerWechat" value={contact.wechat} />
          <input type="hidden" name="borrowerPhone" value={contact.phone} />
        </>
      )}

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
          {external && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "inventory.form.borrowerName", "text"],
                  ["email", "inventory.form.borrowerEmail", "email"],
                  ["wechat", "inventory.form.borrowerWechat", "text"],
                  ["phone", "inventory.form.borrowerPhone", "text"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key} className="flex flex-col gap-2">
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t(label)} *</span>
                  <input
                    type={type}
                    value={contact[key]}
                    onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                    required
                    className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
                  />
                </label>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{t("inventory.form.quantity")} *</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQuantity}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onBlur={(e) => {
                // Rapikan input di luar rentang begitu fokus lepas, biar nilai
                // yang dikirim selalu masuk akal.
                const n = Math.floor(Number(e.target.value));
                if (Number.isFinite(n)) setQuantity(String(Math.min(Math.max(n, 1), maxQuantity)));
              }}
              required
              aria-invalid={qtyError ? true : undefined}
              aria-describedby="quantity-help"
              className={`bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 ${
                qtyError ? "ring-2 ring-error" : "focus:ring-primary-container"
              }`}
            />
            <span
              id="quantity-help"
              className={`text-label-caps ${qtyError ? "text-error" : "text-on-surface-variant"}`}
            >
              {qtyError ?? t("inventory.form.quantityAvailable", { count: maxQuantity })}
            </span>
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
              compressImages={false}
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
