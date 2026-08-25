"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Images, X, AlertCircle, Star } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { addGalleryPhotos } from "@/app/actions/admin-content";
import { ConfirmButton } from "@/components/console/confirm-button";

// Batch photo uploader for a gallery album: pick many files at once (or drag
// them in), each is downscaled/re-encoded client-side before hitting
// /api/upload one by one with visible progress. Every uploaded photo can be
// starred as a highlight right in the batch, so only the good shots hit the
// public gallery - the full set stays on the album's Drive link.
//
// Two modes:
// - albumId given: renders its own save button and persists via
//   addGalleryPhotos (existing album detail page).
// - albumId omitted ("standalone"): lives inside the create-album form and
//   exposes a hidden `photos` input consumed by createGalleryAlbum.
type Item = { key: string; name: string; url?: string; error?: string; highlight: boolean };

export function MultiPhotoUpload({ albumId }: { albumId?: string }) {
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
    const batch: Item[] = images.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, highlight: false }));
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

  const saved = items.filter((it) => it.url);
  const urls = saved.map((it) => it.url!);
  const highlightCount = saved.filter((it) => it.highlight).length;
  const payload = JSON.stringify(saved.map((it) => ({ url: it.url, highlight: it.highlight })));

  function toggleHighlight(key: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, highlight: !it.highlight } : it)));
  }
  function setAllHighlight(value: boolean) {
    setItems((prev) => prev.map((it) => (it.url && !it.error ? { ...it, highlight: value } : it)));
  }

  function save() {
    if (!albumId || urls.length === 0) return;
    const fd = new FormData();
    fd.append("photos", payload);
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
              {!albumId && " Setelah unggah, tandai foto terbaik sebagai highlight."}
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

      {/* Standalone mode feeds the enclosing create-album form via this hidden
          input instead of saving on its own. */}
      {!albumId && <input type="hidden" name="photos" value={payload} />}

      {done && items.length === 0 && (
        <p className="text-body-sm text-primary-container">Semua foto tersimpan ke album.</p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {!working && saved.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-label-caps text-on-surface-variant">
                {highlightCount} dari {saved.length} foto jadi highlight
              </p>
              <button
                type="button"
                onClick={() => setAllHighlight(true)}
                className="flex items-center gap-1 text-label-caps text-primary-container hover:text-primary transition-colors"
              >
                <Star size={13} /> Pilih semua
              </button>
              <button
                type="button"
                onClick={() => setAllHighlight(false)}
                className="text-label-caps text-on-surface-variant hover:text-on-background transition-colors"
              >
                Kosongkan
              </button>
            </div>
          )}
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it) => (
              <li key={it.key} className="relative rounded-lg overflow-hidden bg-surface-container-low aspect-square group">
                {it.error ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
                    <AlertCircle size={18} className="text-error" />
                    <span className="text-label-caps text-error break-all line-clamp-2">{it.name}</span>
                    <span className="text-label-caps text-on-surface-variant">gagal diunggah</span>
                  </div>
                ) : it.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.url} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => toggleHighlight(it.key)}
                      aria-label={it.highlight ? "Hapus dari highlight" : "Jadikan highlight"}
                      aria-pressed={it.highlight}
                      className={`absolute top-2 left-2 p-1.5 rounded-md transition-opacity ${
                        it.highlight
                          ? "bg-primary-container text-on-primary opacity-100"
                          : "bg-inverse-surface/80 text-inverse-on-surface group-hover:opacity-100 sm:opacity-0"
                      }`}
                    >
                      <Star size={14} fill={it.highlight ? "currentColor" : "none"} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center">
                    <Loader2 size={16} className="animate-spin text-on-surface-variant" />
                    <span className="text-label-caps text-on-surface-variant break-all line-clamp-2">{it.name}</span>
                  </div>
                )}
                {!working && !saving && (
                  <ConfirmButton
                    aria-label={`Batalkan ${it.name}`}
                    title="Batalkan foto ini?"
                    message={`"${it.name}" akan dikeluarkan dari batch. Foto yang sudah terunggah ke storage tidak ikut terhapus.`}
                    confirmLabel="Ya, batalkan"
                    className="absolute top-2 right-2 bg-inverse-surface/80 text-inverse-on-surface p-1.5 rounded-md group-hover:opacity-100 sm:opacity-0 transition-opacity hover:bg-error hover:text-on-error"
                    onConfirm={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                  >
                    <X size={14} />
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
          {!working && albumId && (
            <button
              type="button"
              onClick={save}
              disabled={urls.length === 0 || saving}
              className="self-start flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Simpan {urls.length} Foto{highlightCount > 0 ? ` (${highlightCount} highlight)` : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
