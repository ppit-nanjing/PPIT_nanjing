"use client";

import { useState, useRef, type DragEvent } from "react";
import { Upload, Loader2, ImageIcon, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { uploadErrorMessage } from "./upload-error";
import { compressImage } from "@/lib/image-compress";

type Props = {
  name: string;
  folder: "resume" | "news" | "gallery" | "album" | "inventory" | "payment-proof" | "event-doc";
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  accept?: string;
  // Show a plain text input too so a URL can be pasted instead of uploaded.
  allowPaste?: boolean;
  // Langsung unggah begitu file dipilih/drop - untuk alur peserta (bukti bayar)
  // yang tidak seharusnya diminta menekan dua tombol berurutan.
  autoUpload?: boolean;
  // Helper text shown under the label - recommended resolution/ratio guidance.
  hint?: string;
};

export function FileUpload({
  name,
  folder,
  label,
  placeholder,
  required,
  defaultValue,
  accept = "image/*",
  allowPaste = true,
  autoUpload = false,
  hint,
}: Props) {
  const t = useT();
  const [value, setValue] = useState(defaultValue ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
    if (autoUpload) void upload(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function upload(target?: File | null) {
    const chosen = target ?? file;
    if (!chosen) return;
    setUploading(true);
    setError(null);
    try {
      // Site-wide image policy: images (except avatars and animated GIFs,
      // which would lose their animation through a canvas re-encode) are
      // re-encoded to WebP client-side. Non-images - resumes, PDFs - pass
      // through byte-for-byte.
      let payload = chosen as Blob;
      let name = chosen.name;
      if (chosen.type.startsWith("image/") && chosen.type !== "image/gif") {
        payload = await compressImage(chosen);
        const ext = payload.type === "image/webp" ? "webp" : "jpg";
        const base = name.replace(/\.[^.]+$/, "") || "image";
        name = `${base}.${ext}`;
      }
      const fd = new FormData();
      fd.append("file", new File([payload], name, { type: payload.type }));
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(uploadErrorMessage(t, data));
      setValue(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("upload.errFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</span>}
      {hint && <span className="text-body-sm text-on-surface-variant -mt-1">{hint}</span>}
      {allowPaste && (
        <input
          type="text"
          name={name}
          value={value}
          required={required && (autoUpload ? !value : !file)}
          onChange={(e) => {
            const v = e.target.value;
            // Field ini hanya boleh berisi URL hasil unggah (https) atau kosong.
            // Tolak file://, path lokal (C:\…, /Users/…), dan teks yang ter-drop
            // dari OS — nilai begitu tak bisa dibuka admin dan menyesatkan.
            if (v === "" || /^https:\/\//i.test(v.trim())) setValue(v.trim());
          }}
          onDrop={(e) => e.preventDefault()}
          placeholder={placeholder ?? t("upload.pasteOrFile")}
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      )}
      {!allowPaste && value && <input type="hidden" name={name} value={value} />}
      {allowPaste && autoUpload && <input type="hidden" name={name} value={value} />}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-primary-container bg-primary-container/10"
            : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("upload.preview")} className="max-h-40 rounded-md object-contain" />
        ) : (
          <ImageIcon className="text-outline-variant" size={28} />
        )}
        <p className="text-body-sm text-on-surface-variant">
          {file ? file.name : t("upload.dropImage")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      {file && !autoUpload && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void upload()}
            disabled={uploading}
            className="flex items-center gap-2 bg-surface-container-low text-on-background text-body-sm font-medium px-4 py-2.5 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {t("upload.submit")}
          </button>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-error transition-colors"
          >
            <X size={14} /> {t("common.cancel")}
          </button>
        </div>
      )}
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}
