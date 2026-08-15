import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles, galleryAlbums } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { createGalleryAlbum } from "@/app/actions/admin-content";
import { Plus, Newspaper, Images } from "lucide-react";

const STATUS_LABEL: Record<string, string> = { draft: "Draf", published: "Dipublikasikan" };

export default async function ConsoleContentPage() {
  await requireModuleAccess("content");
  const articles = await db.select().from(newsArticles).orderBy(desc(newsArticles.publishedAt));
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));

  return (
    <div className="px-8 py-10">
      <h1 className="text-headline-lg text-on-background mb-8">Konten</h1>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-md text-on-background flex items-center gap-2">
            <Newspaper size={20} className="text-primary-container" /> Berita
          </h2>
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
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-md text-on-background flex items-center gap-2">
            <Images size={20} className="text-primary-container" /> Galeri
          </h2>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </section>
    </div>
  );
}

function NewAlbumForm() {
  return (
    <>
      <input name="title" placeholder="Judul Album *" required className="bg-soft-gray rounded-md p-2.5 text-body-md" />
      <input name="coverImageUrl" placeholder="URL Foto Sampul (opsional)" className="bg-soft-gray rounded-md p-2.5 text-body-md" />
      <button
        type="submit"
        className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-2.5 rounded-md hover:bg-primary transition-colors"
      >
        Buat Album
      </button>
    </>
  );
}
