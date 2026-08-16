"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, Loader2, X, AlertTriangle } from "lucide-react";

function extractToken(raw: string): string | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const t = url.searchParams.get("t");
    if (t) return t;
  } catch {
    // not a URL - treat the raw string as the token itself
  }
  return text || null;
}

export function QrScanner() {
  const router = useRouter();
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => stopCamera, []);

  // Prefer the rear ("environment") camera on phones; fall back to whatever
  // camera the device has (e.g. a laptop's default webcam) when that fails.
  async function openCamera(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (e) {
      if ((e as DOMException)?.name === "NotFoundError" || (e as DOMException)?.name === "OverconstrainedError") {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      throw e;
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, w, h);
    if (result?.data) {
      const token = extractToken(result.data);
      if (token) {
        stopCamera();
        setStatus("idle");
        router.push(`${pathname}?t=${encodeURIComponent(token)}`);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Perangkat/ browser tidak mendukung akses kamera (butuh HTTPS).");
      setStatus("error");
      return;
    }
    setStatus("starting");
    try {
      const stream = await openCamera();
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      stopCamera();
      const err = e as DOMException;
      if (err?.name === "NotAllowedError") {
        setError("Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.");
      } else if (err?.name === "NotFoundError") {
        setError("Tidak ada kamera belakang ditemukan di perangkat ini.");
      } else {
        setError("Tidak bisa membuka kamera. Pastikan koneksi HTTPS dan izin diberikan.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-black aspect-square w-full max-w-sm mx-auto">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {status !== "scanning" && status !== "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
            <Camera className="text-white/70" size={40} />
            <p className="text-body-md text-white/80">
              Arahkan kamera ke QR tiket peserta untuk mencatat kehadiran.
            </p>
          </div>
        )}
        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-2/3 h-2/3 border-2 border-white/80 rounded-lg" />
          </div>
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="text-white animate-spin" size={32} />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-error-container/40 border-l-4 border-error rounded-r-lg p-3 text-body-sm text-on-background">
          <AlertTriangle className="text-error shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-center gap-3">
        {status === "idle" || status === "error" ? (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <Camera size={16} /> Mulai Scan
          </button>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="flex items-center gap-2 text-label-caps uppercase tracking-wide px-6 py-3 rounded-md border border-outline-variant text-secondary hover:text-on-background transition-colors"
          >
            <X size={16} /> Hentikan
          </button>
        )}
      </div>
    </div>
  );
}
