import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles, galleryAlbums } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { createGalleryAlbum } from "@/app/actions/admin-content";
import { Plus, Newspaper, Images } from "lucide-react";
import { FileUpload } from "@/components/upload/file-upload";
import { CollapsibleSection } from "@/components/console/collapsible-section";

const STATUS_LABEL: Record<string, string> = { draft: "Draf", published: "Dipublikasikan" };

export default async function ConsoleContentPage() {
  await requireModuleAccess("content");
  const articles = await db.select().from(newsArticles).orderBy(desc(newsArticles.publishedAt));
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Konten</h1>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Berita" description="Artikel berita yang dipublikasikan.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <a
              href="/console/content/news/new"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Plus size={14} /> Tulis Berita
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {articles.length === 0 && <p className="text-body-md text-on-surface-variant">Belum ada berita.</p>}
            {articles.map((a) => (
              <a
                key={a.id}
                href={`/console/content/news/${a.id}`}
                className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-3 hover:bg-surface-container-low transition-colors"
              >
                <span className="text-body-md text-on-background">{a.title}</span>
                <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded shrink-0">
                  {STATUS_LABEL[a.status]}
                </span>
              </a>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Galeri" description="Album foto kegiatan.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <details className="relative">
              <summary className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors cursor-pointer list-none">
                <Plus size={14} /> Album Baru
              </summary>
              <form
                action={createGalleryAlbum}
                className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3 shadow-[0_10px_30px_rgba(39,23,22,0.08)] z-10"
              >
                <NewAlbumForm />
              </form>
            </details>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.length === 0 && <p className="text-body-md text-on-surface-variant col-span-full">Belum ada album.</p>}
            {albums.map((al) => (
              <a
                key={al.id}
                href={`/console/content/gallery/${al.id}`}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:bg-surface-container-low transition-colors"
              >
                <p className="text-body-md font-medium text-on-background">{al.title}</p>
              </a>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

function NewAlbumForm() {
  return (
    <>
      <input name="title" placeholder="Judul Album *" required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
      <FileUpload name="coverImageUrl" folder="album" label="Foto Sampul (opsional)" placeholder="URL atau unggah gambar" />
      <button
        type="submit"
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-2.5 rounded-md hover:bg-primary transition-colors"
      >
        Buat Album
      </button>
    </>
  );
}
