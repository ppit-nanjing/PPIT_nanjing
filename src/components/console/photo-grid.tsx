"use client";

import { useTransition } from "react";
import { Trash2, Image as ImageIcon } from "lucide-react";
import { deleteGalleryPhoto } from "@/app/actions/admin-content";

interface Photo {
  id: string;
  imageUrl: string;
  caption: string | null;
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {photos.map((p) => (
        <div key={p.id} className="relative group rounded-lg overflow-hidden bg-surface-container-low">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt={p.caption ?? ""} className="w-full aspect-square object-cover" />
          <button
            onClick={() => startTransition(() => deleteGalleryPhoto(p.id, albumId))}
            className="absolute top-2 right-2 bg-inverse-surface/80 text-inverse-on-surface p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Hapus foto"
          >
            <Trash2 size={14} />
          </button>
          {p.caption && <p className="text-label-caps text-on-surface-variant p-2 truncate">{p.caption}</p>}
        </div>
      ))}
    </div>
  );
}
