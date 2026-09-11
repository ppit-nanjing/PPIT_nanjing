import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { getEventAccess } from "@/lib/event-access";
import { setAlbumDriveUrl, updateGalleryAlbum, deleteGalleryAlbum } from "@/app/actions/admin-content";
import { MultiPhotoUpload } from "@/components/console/multi-photo-upload";
import { PhotoGrid } from "@/components/console/photo-grid";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { SubmitButton } from "@/components/console/submit-button";
import { ConfirmButton } from "@/components/console/confirm-button";
import { FlashToast } from "@/components/console/flash-toast";
import { ImageUploadCropper } from "@/components/upload/image-upload-cropper";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ConsoleAlbumDetailPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId));
  if (!album) notFound();

  // Modul Konten kabinet ATAU Divisi Dokumentasi acara (grant "Galeri") kalau
  // album ini tertaut ke acara mereka.
  const session = await auth();
  if (!session) redirect("/login");
  const hasContent = hasModuleAccess(session.user.adminScope ?? null, "content");
  let allowed = hasContent;
  if (!allowed && album.eventId) {
    allowed = (await getEventAccess(album.eventId)).can("event.manageGallery");
  }
  if (!allowed) redirect("/console");
  const backHref = !hasContent && album.eventId ? `/console/events/${album.eventId}` : "/console/content";
  const photos = await db.select().from(galleryPhotos).where(eq(galleryPhotos.albumId, albumId));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-3xl">
      <FlashToast />
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">{album.title}</h1>
        <ConfirmButton
          action={deleteGalleryAlbum.bind(null, albumId)}
          title="Hapus album?"
          message="Album beserta semua fotonya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
          confirmLabel="Ya, hapus album"
          className="text-label-caps uppercase tracking-wide text-error hover:opacity-80 px-3 py-2 rounded-md hover:bg-error-container/30 transition-colors"
        >
          Hapus Album
        </ConfirmButton>
      </div>

      <CollapsibleSection title="Detail Album" defaultOpen>
        <form action={updateGalleryAlbum.bind(null, albumId)} className="flex flex-col gap-6 mb-10">
          <label className="flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">Judul Album</span>
            <input
              name="title"
              required
              defaultValue={album.title}
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </label>
          <ImageUploadCropper
            name="coverImageUrl"
            folder="album"
            label="Foto Sampul (opsional)"
            defaultValue={album.coverImageUrl ?? ""}
            aspect={16 / 9}
            hint="Ideal 1920 × 1080 px (16:9) — gambar di-crop & dikompres otomatis."
          />
          <SubmitButton
            successMessage="Detail album tersimpan."
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Simpan Perubahan
          </SubmitButton>
        </form>
      </CollapsibleSection>

      <CollapsibleSection title="Link Google Drive Semua Foto" defaultOpen>
        <form action={setAlbumDriveUrl.bind(null, albumId)} className="flex flex-col gap-3 sm:flex-row sm:items-end mb-10">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Pengunjung mengambil foto lengkap lewat link ini
            </span>
            <input
              name="driveUrl"
              type="url"
              defaultValue={album.driveUrl ?? ""}
              placeholder="https://drive.google.com/..."
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
          </label>
          <SubmitButton
            successMessage="Link Google Drive tersimpan."
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors shrink-0"
          >
            Simpan Link
          </SubmitButton>
        </form>
      </CollapsibleSection>

      <CollapsibleSection title="Galeri Album">
        <MultiPhotoUpload albumId={albumId} />

        <PhotoGrid albumId={albumId} photos={photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl, caption: p.caption, isHighlight: p.isHighlight }))} />
      </CollapsibleSection>
    </div>
  );
}
