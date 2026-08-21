"use client";

import { useState, type ChangeEvent } from "react";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { uploadErrorMessage } from "./upload-error";

export function FileUploadField({
  name,
  folder,
  required,
  value,
  disabled,
}: {
  name: string;
  folder: string;
  required?: boolean;
  value?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const [url, setUrl] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(uploadErrorMessage(t, data));
      setUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("upload.errFailed"));
    } finally {
      setBusy(false);
    }
  }

  const fileName = url ? decodeURIComponent(url.split("/").pop() ?? url) : "";

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="flex items-center gap-2 bg-soft-gray rounded-md p-3">
          <FileText size={18} className="text-primary-container shrink-0" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-body-md text-primary-container underline break-all flex-1">
            {fileName}
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={() => setUrl("")}
              aria-label={t("upload.remove")}
              className="text-on-surface-variant hover:text-error p-1 rounded-full hover:bg-error-container/30"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 bg-soft-gray text-on-background rounded-md px-4 py-3 cursor-pointer hover:bg-surface-container transition-colors">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} className="text-primary-container" />}
          <span className="text-body-md">{busy ? t("upload.uploading") : t("upload.choose")}</span>
          <input type="file" className="hidden" onChange={onSelect} disabled={disabled || busy} />
        </label>
      )}
      {required && !url && <span className="text-label-caps text-on-surface-variant">{t("upload.required")}</span>}
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}
