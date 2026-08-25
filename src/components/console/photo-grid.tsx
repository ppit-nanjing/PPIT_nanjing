"use client";

import { useTransition } from "react";
import { Trash2, Image as ImageIcon, Star } from "lucide-react";
import NextImage from "next/image";
import { deleteGalleryPhoto, setPhotoHighlight } from "@/app/actions/admin-content";
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
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square group rounded-lg overflow-hidden bg-surface-container-low">
            <NextImage
              src={p.imageUrl}
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
                  : "bg-inverse-surface/80 text-inverse-on-surface opacity-0 group-hover:opacity-100"
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
            {p.caption && <p className="text-label-caps text-on-surface-variant p-2 truncate">{p.caption}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
