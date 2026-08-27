"use client";

import { useRef, useState, useEffect } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, ScanLine, ShieldCheck, Upload, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { PassportMrzResult } from "@/lib/mrz";

type Props = Readonly<{ onResult: (result: PassportMrzResult) => void }>;

export function PassportScanner({ onResult }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "corrected" | "error">("idle");

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      stopCamera();
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

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraMode(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")) {
        setCameraError(t("sensus.passportScanCameraDenied"));
      } else {
        setCameraError(t("sensus.passportScanCameraError"));
      }
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraMode(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (blob) {
      await scan(new File([blob], "passport-capture.png", { type: "image/png" }));
    }
  }

  function closeModal() {
    setOpen(false);
    stopCamera();
    setCameraError(null);
  }

  let statusMessage = "";
  if (status === "error") statusMessage = t("sensus.passportScanError");
  if (status === "corrected") statusMessage = t("sensus.passportScanCorrected");
  if (status === "success") statusMessage = t("sensus.passportScanSuccess");

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

      {open && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          onClick={() => !scanning && closeModal()}
          onKeyDown={(event) => {
            if (scanning) return;
            if (event.key === "Escape") closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("sensus.passportScanModalTitle")}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h2 className="text-headline-sm text-on-background">{t("sensus.passportScanModalTitle")}</h2>
              <button
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
              {cameraMode ? (
                <div className="flex flex-col gap-3">
                  <div className="relative aspect-4/3 bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={capturePhoto}
                      className="inline-flex items-center gap-2 rounded-md bg-primary-container text-on-primary px-4 py-2 text-label-caps font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2"
                    >
                      {scanning ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                      {scanning ? t("sensus.passportScanning") : t("sensus.passportScanModalCapture")}
                    </button>
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={stopCamera}
                      className="inline-flex items-center gap-2 rounded-md border border-outline-variant text-on-background px-4 py-2 text-label-caps font-semibold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2"
                    >
                      {t("sensus.passportScanModalClose")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
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
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    className={`w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
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
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xs text-on-surface-variant">{t("sensus.passportScanModalOr")}</span>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="inline-flex items-center gap-2 rounded-md bg-primary text-on-primary px-4 py-2 text-label-caps font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <Camera size={16} />
                      {t("sensus.passportScanModalCamera")}
                    </button>
                  </div>
                  {cameraError && (
                    <p className="text-body-sm text-error flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      {cameraError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
