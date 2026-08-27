"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { PassportMrzResult } from "@/lib/mrz";

type Props = Readonly<{ onResult: (result: PassportMrzResult) => void }>;

export function PassportScanner({ onResult }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
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
    } catch {
      setStatus("error");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  let statusMessage = "";
  if (status === "error") statusMessage = t("sensus.passportScanError");
  if (status === "corrected") statusMessage = t("sensus.passportScanCorrected");
  if (status === "success") statusMessage = t("sensus.passportScanSuccess");

  return (
    <div className="border border-outline-variant rounded-lg p-4 bg-surface-container-low flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void scan(file);
        }}
      />
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
        onClick={() => inputRef.current?.click()}
        className="self-start inline-flex items-center gap-2 rounded-md bg-primary-container text-on-primary px-4 py-2 text-label-caps font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2"
      >
        {scanning ? <Loader2 className="animate-spin" size={16} /> : <ScanLine size={16} />}
        {scanning ? t("sensus.passportScanning") : t("sensus.passportScanAction")}
      </button>
      {scanning && (
        <div className="flex items-center gap-3" aria-live="polite">
          <progress className="w-full accent-primary-container" max={1} value={progress} />
          <span className="text-xs tabular-nums text-on-surface-variant">{Math.round(progress * 100)}%</span>
        </div>
      )}
      {status !== "idle" && !scanning && (
        <output
          className={`flex items-start gap-2 text-xs ${status === "error" ? "text-error" : "text-on-surface-variant"}`}
          aria-live={status === "error" ? "assertive" : "polite"}
        >
          {status === "error" ? (
            <AlertTriangle size={15} className="shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="text-primary-container shrink-0" />
          )}
          {statusMessage}
        </output>
      )}
    </div>
  );
}