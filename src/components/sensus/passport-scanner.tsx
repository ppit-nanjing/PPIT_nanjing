"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ScanLine, ShieldCheck, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useT } from "@/lib/i18n/client";
import type { PassportMrzResult } from "@/lib/mrz";

type Props = Readonly<{ onResult: (result: PassportMrzResult) => void }>;

export function PassportScanner({ onResult }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "corrected" | "error">("idle");

  async function scan(file: File) {
    setScanning(true);
    setProgress(0);
    setStatus("idle");
    try {
      const { scanPassportImage } = await import("@/lib/passport-ocr");
      const result = await scanPassportImage(file, setProgress);
      if (!result) {
        setStatus("error");
        return;
      }
      onResult(result);
      setStatus(result.correctedFields.length > 0 ? "corrected" : "success");
      setOpen(false);
    } catch {
      setStatus("error");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void scan(file);
  }

  const closeModal = useCallback(() => {
    setOpen(false);
    setStatus("idle");
  }, []);

  // Modal harus memindahkan fokus ke dalam, menahan Tab di dalam (focus trap),
  // menutup dengan Escape, dan mengunci scroll body selama terbuka.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables.at(-1)!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open, closeModal]);

  let statusMessage = "";
  if (status === "error") statusMessage = t("sensus.passportScanError");
  if (status === "corrected") statusMessage = t("sensus.passportScanCorrected");
  if (status === "success") statusMessage = t("sensus.passportScanSuccess");

  const progressBar = (
    <div className="w-full" aria-live="polite">
      <div className="flex items-center justify-between text-label-caps text-on-surface-variant mb-2">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} />
          {t("sensus.passportScanning")}
        </span>
        <span className="tabular-nums">{Math.round(progress * 100)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={t("sensus.passportScanning")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-3 w-full rounded-full bg-surface-container-high overflow-hidden"
      >
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-primary-container via-primary to-primary-container relative"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(5, progress * 100)}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        >
          <span
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
              animation: "passport-scan-shimmer 1.4s infinite linear",
            }}
          />
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-primary-container shrink-0 mt-0.5" size={18} />
          <div className="min-w-0">
            <p className="text-body-md font-medium text-on-background">{t("sensus.passportScanTitle")}</p>
            <p className="text-xs text-on-surface-variant mt-1">{t("sensus.passportScanPrivacy")}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={scanning}
          onClick={() => setOpen(true)}
          className="self-start inline-flex items-center gap-2 rounded-md bg-primary-container text-on-primary px-4 py-2 text-label-caps font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2"
        >
           <ScanLine size={16} />
           {t("sensus.passportScanAction")}
        </button>
        {status !== "idle" && status !== "error" && !scanning && (
          <output
            className="flex items-start gap-2 text-xs text-on-surface-variant"
            aria-live="polite"
          >
            <CheckCircle2 size={15} className="text-primary-container shrink-0" />
            {statusMessage}
          </output>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 100 }}
          onClick={() => !scanning && closeModal()}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("sensus.passportScanModalTitle")}
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="text-headline-sm font-bold text-on-background">{t("sensus.passportScanModalTitle")}</h2>
              <button
                ref={closeRef}
                type="button"
                disabled={scanning}
                onClick={closeModal}
                className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                aria-label={t("sensus.passportScanModalClose")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {scanning && progressBar}
              {status === "error" && !scanning && (
                <output className="mb-4 flex items-start gap-2 rounded-md border border-error/40 bg-error-container/20 p-3 text-body-sm text-error" aria-live="assertive">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {statusMessage}
                </output>
              )}
              <div className={`flex flex-col gap-3 ${scanning ? "pointer-events-none opacity-60" : ""}`}>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void scan(file);
                    }}
                  />
                  <button
                    type="button"
                     disabled={scanning}
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                     className={`w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors disabled:opacity-50 ${
                      dragging
                        ? "border-primary-container bg-primary-container/10"
                        : "border-outline-variant bg-surface-container-low hover:border-primary-container/60"
                    }`}
                  >
                    <Upload size={32} className="text-primary-container" />
                    <div>
                      <p className="text-body-md font-medium text-on-background">
                        {dragging ? t("sensus.passportScanModalDropActive") : t("sensus.passportScanModalDrop")}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">JPG / PNG / WebP</p>
                    </div>
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
