"use client";

import { useTransition } from "react";
import { Trash2, Image as ImageIcon, Star, Type as CaptionIcon } from "lucide-react";
import NextImage from "next/image";
import { deleteGalleryPhoto, setPhotoHighlight, updatePhotoCaption } from "@/app/actions/admin-content";
import { ConfirmButton } from "@/components/console/confirm-button";

interface Photo {
  id: string;
  imageUrl: string;
  caption: string | null;
  isHighlight: boolean;
}

export function PhotoGrid({ albumId, photos }: { albumId: string; photos: Photo[] }) {
  const [, startTransition] = useTransition();

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16 text-on-surface-variant">
        <ImageIcon className="mb-3" size={32} />
        <p className="text-body-md">Belum ada foto di album ini.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-body-sm text-on-surface-variant mb-3">
        Tandai bintang untuk foto <strong>highlight</strong> — hanya foto bertanda yang tampil di galeri publik.
        Caption juga dipakai sebagai teks alt oleh pembaca layar.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square group rounded-lg overflow-hidden bg-surface-container-low">
            <NextImage
              src={p.imageUrl}
              // Caption doubles as alt text - empty when the admin hasn't
              // written one yet (decorative tile for screen readers).
              alt={p.caption ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 20vw"
              className="object-cover"
            />
            <button
              onClick={() => startTransition(() => setPhotoHighlight(p.id, albumId, !p.isHighlight))}
              className={`absolute top-2 left-2 p-1.5 rounded-md transition-opacity ${
                p.isHighlight
                  ? "bg-primary-container text-on-primary opacity-100"
                  : "bg-inverse-surface/80 text-inverse-on-surface opacity-40 group-hover:opacity-100"
              }`}
              aria-label={p.isHighlight ? "Hapus dari highlight" : "Jadikan highlight"}
              aria-pressed={p.isHighlight}
            >
              <Star size={14} fill={p.isHighlight ? "currentColor" : "none"} />
            </button>
            <ConfirmButton
              title="Hapus foto?"
              message="Foto dihapus permanen dari album (berkas di storage tidak ikut terhapus)."
              className="absolute top-2 right-2 bg-inverse-surface/80 text-inverse-on-surface p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              onConfirm={() => deleteGalleryPhoto(p.id, albumId)}
            >
              <Trash2 size={14} />
            </ConfirmButton>

            {/* Pure-HTML details toggle keeps this server-friendly; the save
                itself runs through a transition so revalidate refreshes the
                grid in place. */}
            <details className="absolute inset-x-0 bottom-0">
              <summary className="flex items-center gap-1.5 bg-inverse-surface/80 text-inverse-on-surface text-label-caps px-2 py-1 cursor-pointer list-none">
                <CaptionIcon size={12} aria-hidden />
                <span className="truncate">{p.caption || "+ caption"}</span>
              </summary>
              <form
                action={(fd) => {
                  const caption = String(fd.get("caption") ?? "");
                  startTransition(() => updatePhotoCaption(p.id, albumId, caption));
                }}
                className="bg-surface-container-lowest border-t border-outline-variant p-2 flex flex-col gap-2"
              >
                <input
                  name="caption"
                  defaultValue={p.caption ?? ""}
                  placeholder="Tulis caption…"
                  maxLength={200}
                  className="w-full bg-soft-gray rounded-md px-2 py-1.5 text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                />
                <button
                  type="submit"
                  className="self-start text-label-caps uppercase tracking-wide bg-primary-container text-on-primary px-3 py-1 rounded-md hover:bg-primary transition-colors"
                >
                  Simpan
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
