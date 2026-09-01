"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Upload, Loader2, ImageIcon, X, Crop } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n/translate";
import { readUploadResult } from "./upload-error";
import { compressImage } from "@/lib/image-compress";

type Props = {
  // Uncontrolled (form-submit) mode: a hidden input named `name` carries the
  // uploaded URL into the surrounding <form action>. Controlled mode (used by
  // the Sensus wizard, which collects values into local state and submits via a
  // server action) instead passes `value` + `onValueChange` and omits `name`.
  name?: string;
  folder: "resume" | "news" | "gallery" | "album" | "inventory" | "avatar" | "sensus" | "events" | "membership" | "catalog" | "donation";
  label?: string;
  /** @deprecated tidak dipakai lagi - komponen ini murni unggah berkas. */
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  accept?: string;
  /** @deprecated dulu membuka input tempel-tautan; sekarang SELALU unggah berkas (drag-drop / pilih / kamera). */
  allowPaste?: boolean;
  // Aspect ratio for the crop step (e.g. 1 for square headshots, 16/9 for
  // covers). When omitted the image is uploaded as-is with no crop step.
  aspect?: number;
  // Helper text shown under the label - recommended resolution/ratio guidance
  // so admins know what size to prepare before uploading.
  hint?: string;
  // Controlled mode.
  value?: string;
  onValueChange?: (url: string) => void;
};

function getCroppedBlob(imageSrc: string, pixelCrop: Area, t: T): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(t("upload.errProcess")));
        return;
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error(t("upload.errCrop")))),
        "image/jpeg",
        0.92
      );
    };
    image.onerror = () => reject(new Error(t("upload.errLoad")));
    image.src = imageSrc;
  });
}

export function ImageUploadCropper({
  name,
  folder,
  label,
  defaultValue,
  accept = "image/*",
  aspect,
  hint,
  value,
  onValueChange,
}: Props) {
  const t = useT();
  const isControlled = onValueChange !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = isControlled ? value ?? "" : internalValue || value || "";

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop modal state
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function commit(url: string) {
    if (!isControlled) setInternalValue(url);
    onValueChange?.(url);
  }

  async function uploadBlob(rawBlob: Blob, filename: string) {
    setUploading(true);
    setError(null);
    try {
      // Site-wide image policy: everything except profile pictures is
      // re-encoded to WebP client-side; avatars keep their (JPEG) crop output
      // for maximum compatibility with in-app browsers.
      const blob = folder === "avatar" ? rawBlob : await compressImage(rawBlob);
      const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
      const base = filename.replace(/\.[^.]+$/, "") || "image";
      const fd = new FormData();
      fd.append("file", new File([blob], `${base}-${Date.now()}.${ext}`, { type: blob.type }));
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      commit(await readUploadResult(res, t));
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("upload.errFailed"));
      // Unggah gagal: buang pratinjau supaya tidak terlihat seolah tersimpan
      // (nilai yang di-commit tidak berubah - kalau kosong, tetap kosong).
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  function onSelectFile(f: File) {
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    if (aspect) {
      setFile(f);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropping(true);
    } else {
      // No crop step: upload immediately so the value is committed without an
      // extra "Unggah" click (e.g. Sensus student card). The user shouldn't have
      // to know the preview alone doesn't save anything.
      void uploadBlob(f, f.name);
    }
  }

  async function handleCropConfirm() {
    if (!previewUrl || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(previewUrl, croppedAreaPixels, t);
      await uploadBlob(blob, file?.name ?? "image.jpg");
      setCropping(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("upload.errCrop"));
    }
  }

  async function handleDirectUpload() {
    if (!file) return;
    await uploadBlob(file, file.name);
  }

  // Nilai tersimpan yang bukan URL hasil unggah (mis. "file:///…" warisan data
  // lama) tidak boleh ditampilkan sebagai gambar tersimpan - perlakukan seperti
  // belum ada, supaya dropzone-nya kosong dan mendorong unggah ulang.
  const savedUrl = /^(https?:\/\/|\/api\/|data:)/i.test(currentValue) ? currentValue : "";
  const displayUrl = previewUrl ?? savedUrl;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
          {label}
        </span>
      )}
      {hint && <span className="text-body-sm text-on-surface-variant -mt-1">{hint}</span>}

      {name && <input type="hidden" name={name} value={currentValue} />}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onSelectFile(f);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
          dragging
            ? "border-primary-container bg-primary-container/5"
            : "border-outline-variant bg-soft-gray hover:bg-surface-container-low"
        }`}
      >
        {displayUrl ? (
          <div className="flex flex-col items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt={t("upload.preview")} className="max-h-40 rounded-md object-contain border border-outline-variant" />
            <span className="text-label-caps text-on-surface-variant">{t("upload.preview")}</span>
            <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-label-caps text-primary-container hover:text-secondary transition-colors"
              >
                <Upload size={12} /> {t("upload.changeImage")}
              </button>
              <span className="text-outline-variant" aria-hidden>|</span>
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setFile(null);
                  setError(null);
                  commit("");
                }}
                className="flex items-center gap-1 text-label-caps text-error hover:opacity-80 transition-opacity"
              >
                <X size={12} /> {t("upload.removeImage")}
              </button>
            </div>
          </div>
        ) : (
          <ImageIcon className="text-secondary" size={28} />
        )}
        <p className="text-label-caps text-on-surface-variant text-center">
          {displayUrl
            ? t("upload.replaceImage")
            : t("upload.dropImageShort")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelectFile(f);
          }}
        />
      </div>

      {file && !aspect && !uploading && (
        <button
          type="button"
          onClick={handleDirectUpload}
          className="self-start flex items-center gap-2 bg-surface-container-low text-on-background text-body-sm font-medium px-4 py-2.5 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors"
        >
          <Upload size={14} /> {t("upload.submit")}
        </button>
      )}

      {uploading && (
        <span className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <Loader2 size={14} className="animate-spin" /> {t("upload.uploading")}
        </span>
      )}
      {savedUrl && !uploading && (
        <span className="flex items-center gap-1 text-body-sm text-primary-container truncate">
          <Crop size={12} /> {savedUrl.split("/").pop()}
        </span>
      )}
      {error && <p className="text-body-sm text-error">{error}</p>}

      {cropping && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant">
              <p className="text-body-md font-semibold text-on-background">{t("upload.cropTitle")}</p>
              <button
                type="button"
                onClick={() => setCropping(false)}
                className="text-secondary hover:text-on-background"
                aria-label={t("common.cancel")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative bg-black" style={{ width: "100%", height: 320 }}>
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect ?? 1}
                cropShape={aspect === 1 ? "round" : "rect"}
                showGrid={aspect === 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                style={{ containerStyle: { width: "100%", height: "100%" } }}
              />
            </div>
            <div className="flex flex-col gap-3 px-5 py-4">
              <label className="flex items-center gap-3 text-body-md text-on-surface-variant">
                <span className="text-label-caps uppercase tracking-wide w-16">{t("upload.zoom")}</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </label>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCropping(false)}
                  className="text-body-sm text-secondary px-4 py-2.5 rounded-md hover:text-on-background transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleCropConfirm}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Crop size={14} />} {t("upload.cropUse")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
