import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsArticles, galleryAlbums } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { setNewsArticleStatus } from "@/app/actions/admin-content";
import { Plus } from "lucide-react";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { DeleteNewsButton } from "@/components/console/delete-news-button";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Dipublikasikan",
  archived: "Arsip",
};

type Article = typeof newsArticles.$inferSelect;

function NewsRow({ a }: { a: Article }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-surface-container-lowest border border-outline-variant rounded-lg pl-5 pr-2 py-2 hover:bg-surface-container-low transition-colors">
      <Link
        href={`/console/content/news/${a.id}`}
        className="w-full sm:flex-1 sm:min-w-0 flex items-center justify-between gap-3 py-1.5"
      >
        <span className="text-body-md text-on-background truncate">{a.title}</span>
        <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded shrink-0">
          {STATUS_LABEL[a.status]}
        </span>
      </Link>
      <div className="self-end sm:self-auto flex items-center gap-2 sm:shrink-0">
        {a.status === "archived" ? (
          <ConfirmButton
            title="Pulihkan berita?"
            message={`"${a.title}" akan kembali menjadi draf. Publikasikan lagi lewat halaman edit.`}
            confirmLabel="Ya, pulihkan"
            action={setNewsArticleStatus}
            payload={{ id: a.id, status: "draft" }}
            danger={false}
            className="text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Pulihkan
          </ConfirmButton>
        ) : (
          <ConfirmButton
            title="Arsipkan berita?"
            message={`"${a.title}" akan disembunyikan dari halaman publik tapi tetap tersimpan di sini.`}
            confirmLabel="Ya, arsipkan"
            action={setNewsArticleStatus}
            payload={{ id: a.id, status: "archived" }}
            danger={false}
            className="text-label-caps uppercase tracking-wide px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Arsipkan
          </ConfirmButton>
        )}
        <DeleteNewsButton id={a.id} />
      </div>
    </div>
  );
}

export default async function ConsoleContentPage() {
  await requireModuleAccess("content");
  // NULLS LAST: draft (publishedAt null) must not float above published news.
  const articles = await db
    .select()
    .from(newsArticles)
    .orderBy(sql`${newsArticles.publishedAt} desc nulls last`);
  const albums = await db.select().from(galleryAlbums).orderBy(desc(galleryAlbums.createdAt));
  const guide = await getGuide("konten");

  const activeArticles = articles.filter((a) => a.status !== "archived");
  const archivedArticles = articles.filter((a) => a.status === "archived");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <h1 className="text-headline-md sm:text-headline-lg text-on-background">Konten</h1>
        {guide && <GuideButton title={guide.title} content={guide.content} docSlug="konten" />}
      </div>

      <div className="flex flex-col gap-6">
        <CollapsibleSection title="Berita" description="Artikel berita yang dipublikasikan.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Link
              href="/console/content/news/new"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Plus size={14} /> Tulis Berita
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {activeArticles.length === 0 && (
              <p className="text-body-md text-on-surface-variant">Belum ada berita.</p>
            )}
            {activeArticles.map((a) => (
              <NewsRow key={a.id} a={a} />
            ))}
          </div>
        </CollapsibleSection>

        {archivedArticles.length > 0 && (
          <CollapsibleSection
            title={`Arsip Berita (${archivedArticles.length})`}
            description="Berita lama yang sudah dipensiunkan. Tidak tampil di halaman publik."
            defaultOpen={false}
          >
            <div className="flex flex-col gap-2">
              {archivedArticles.map((a) => (
                <NewsRow key={a.id} a={a} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Galeri" description="Album foto kegiatan.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Link
              href="/console/content/gallery/new"
              className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-4 py-2.5 rounded-md hover:bg-primary transition-colors"
            >
              <Plus size={14} /> Album Baru
            </Link>
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
