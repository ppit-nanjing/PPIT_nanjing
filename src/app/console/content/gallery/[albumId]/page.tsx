import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { addGalleryPhoto } from "@/app/actions/admin-content";
import { PhotoGrid } from "@/components/console/photo-grid";
import { FileUpload } from "@/components/upload/file-upload";

export default async function ConsoleAlbumDetailPage({ params }: { params: Promise<{ albumId: string }> }) {
  await requireModuleAccess("content");
  const { albumId } = await params;
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();
  const photos = await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, albumId));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">{album.title}</h1>

      <form action={addGalleryPhoto.bind(null, albumId)} className="flex flex-col gap-3 sm:flex-row sm:items-end mb-10">
        <div className="flex-1">
          <FileUpload name="imageUrl" folder="gallery" label="URL Foto *" placeholder="URL atau unggah gambar" required />
        </div>
        <input name="caption" placeholder="Keterangan (opsional)" className="flex-1 bg-soft-gray rounded-md p-3 text-body-md" />
        <button
          type="submit"
          className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors shrink-0"
        >
          Tambah Foto
        </button>
      </form>

      <PhotoGrid albumId={albumId} photos={photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl, caption: p.caption }))} />
    </div>
  );
}
