"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  name: string;
  folder: "resume" | "news" | "gallery" | "album" | "inventory";
  label?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  accept?: string;
  // Show a plain text input too so a URL can be pasted instead of uploaded.
  allowPaste?: boolean;
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
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengunggah");
      setValue(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">{label}</span>}
      {allowPaste && (
        <input
          type="text"
          name={name}
          value={value}
          required={required}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? "Tempel URL atau unggah berkas"}
          className="bg-soft-gray rounded-md p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
        />
      )}
      {!allowPaste && value && <input type="hidden" name={name} value={value} />}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-body-sm text-on-surface-variant file:mr-3 file:bg-surface-container-low file:border file:border-outline-variant file:rounded-md file:px-3 file:py-1.5 file:text-body-sm"
        />
        <button
          type="button"
          onClick={upload}
          disabled={!file || uploading}
          className="flex items-center gap-2 bg-surface-container-low text-on-background text-body-sm font-medium px-4 py-2.5 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Unggah
        </button>
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}
