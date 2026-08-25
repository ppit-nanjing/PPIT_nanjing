import { requireModuleAccess } from "@/lib/admin-scope";
import { createGalleryAlbum } from "@/app/actions/admin-content";
import { FileUpload } from "@/components/upload/file-upload";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewGalleryAlbumPage() {
  await requireModuleAccess("content");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <Link
        href="/console/content"
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali ke Konten
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Album Baru</h1>
      <CollapsibleSection title="Formulir Album">
        <form action={createGalleryAlbum} className="flex flex-col gap-6">
          <input name="title" placeholder="Judul Album *" required className="bg-soft-gray rounded-md p-3 text-body-md" />
          <FileUpload name="coverImageUrl" folder="album" label="Foto Sampul (opsional)" placeholder="URL atau unggah gambar" />
          <label className="flex flex-col gap-2">
            <span className="text-label-caps uppercase tracking-wide text-on-surface-variant">
              Link Google Drive Semua Foto (opsional)
            </span>
            <input
              name="driveUrl"
              type="url"
              placeholder="https://drive.google.com/..."
              className="bg-soft-gray rounded-md p-3 text-body-md"
            />
            <span className="text-body-sm text-on-surface-variant">
              Halaman publik hanya menampilkan foto highlight — pengunjung mengambil foto lengkap lewat link ini.
            </span>
          </label>
          <button
            type="submit"
            className="self-start bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors"
          >
            Buat Album
          </button>
        </form>
      </CollapsibleSection>
    </div>
  );
}
