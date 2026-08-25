"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Images, X, AlertCircle, Check } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { addGalleryPhotos } from "@/app/actions/admin-content";
import { ConfirmButton } from "@/components/console/confirm-button";

// Batch photo uploader for a gallery album: pick many files at once (or drag
// them in), each is downscaled/re-encoded client-side before hitting
// /api/upload one by one with visible progress, then all URLs are persisted
// in a single bulk insert. A failed file doesn't abort the batch - it's
// reported and the rest continue.
type Item = { key: string; name: string; url?: string; error?: string };

export function MultiPhotoUpload({ albumId }: { albumId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [working, setWorking] = useState(false);
  const [saving, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setDone(false);
    setWorking(true);
    const batch: Item[] = images.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name }));
    setItems(batch);

    for (let i = 0; i < images.length; i++) {
      try {
        // Sequential on purpose - keeps memory flat and gives honest progress.
        const blob = await compressImage(images[i]);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const fd = new FormData();
        fd.append("file", new File([blob], `photo-${Date.now()}-${i}.${ext}`, { type: blob.type }));
        fd.append("folder", "gallery");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.errorKey ?? "upload failed");
        setItems((prev) => prev.map((it) => (it.key === batch[i].key ? { ...it, url: data.url } : it)));
      } catch {
        setItems((prev) => prev.map((it) => (it.key === batch[i].key ? { ...it, error: "gagal" } : it)));
      }
    }
    setWorking(false);
  }

  const urls = items.filter((it) => it.url).map((it) => it.url!);

  function save() {
    if (urls.length === 0) return;
    const fd = new FormData();
    fd.append("urls", JSON.stringify(urls));
    startTransition(async () => {
      await addGalleryPhotos(albumId, fd);
      setItems([]);
      setDone(true);
    });
  }

  return (
    <div className="flex flex-col gap-3 mb-10">
      <div
        onClick={() => !working && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!working) void handleFiles(Array.from(e.dataTransfer.files ?? []));
        }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 transition-colors ${
          working ? "opacity-60 cursor-wait border-outline-variant bg-soft-gray" : "cursor-pointer border-outline-variant bg-soft-gray hover:bg-surface-container-low"
        }`}
      >
        {working ? (
          <>
            <Loader2 size={28} className="animate-spin text-secondary" />
            <p className="text-label-caps text-on-surface-variant">
              Mengunggah {Math.min(items.filter((it) => it.url || it.error).length + 1, items.length)}/{items.length} foto…
            </p>
          </>
        ) : (
          <>
            <Images size={28} className="text-secondary" />
            <p className="text-label-caps text-on-surface-variant text-center">
              Klik atau seret beberapa foto sekaligus
            </p>
            <p className="text-body-sm text-on-surface-variant/70 text-center max-w-xs">
              Foto di-resize ke sisi terpanjang 1920 px & dikompres WebP otomatis.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {done && items.length === 0 && (
        <p className="text-body-sm text-primary-container">Semua foto tersimpan ke album.</p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1">
            {items.map((it) => (
              <li key={it.key} className="flex items-center gap-2 text-body-sm">
                {it.error ? (
                  <>
                    <AlertCircle size={14} className="text-error shrink-0" />
                    <span className="truncate text-error">{it.name}</span>
                  </>
                ) : (
                  <>
                    {it.url ? (
                      <span className="w-4 h-4 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                        <Check size={10} aria-hidden />
                      </span>
                    ) : (
                      <Loader2 size={14} className="animate-spin text-on-surface-variant shrink-0" />
                    )}
                    <span className="truncate">{it.name}</span>
                  </>
                )}
                {!working && !saving && (
                  <ConfirmButton
                    aria-label={`Batalkan ${it.name}`}
                    title="Batalkan foto ini?"
                    message={`"${it.name}" akan dikeluarkan dari batch. Foto yang sudah terunggah ke storage tidak ikut terhapus.`}
                    confirmLabel="Ya, batalkan"
                    className="ml-auto text-on-surface-variant hover:text-error shrink-0"
                    onConfirm={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                  >
                    <X size={14} />
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
          {!working && (
            <button
              type="button"
              onClick={save}
              disabled={urls.length === 0 || saving}
              className="self-start flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Simpan {urls.length} Foto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
