"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, Images, MoreHorizontal, PenLine, Search } from "lucide-react";
import { deleteGalleryAlbum, setNewsArticleStatus } from "@/app/actions/admin-content";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ConfirmButton } from "@/components/console/confirm-button";
import { DeleteNewsButton } from "@/components/console/delete-news-button";
import { EventStatusMark, type EventStatusTone } from "@/components/console/event-status-mark";

// Daftar Konten konsol, sengaja berbentuk seperti papan Kegiatan dan halaman publik /news:
// berita terbaru besar, kartu bersampul, arsip abu-abu di bawah. Semua label dihitung di server.

export type ContentTab = "berita" | "galeri";

export type BoardArticle = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  status: "draft" | "published" | "archived";
  /** Hanya terisi untuk berita terbaru, supaya isi berita lain tidak ikut terkirim. */
  excerpt: string | null;
  dateLabel: string;
  author: string | null;
  eventTitle: string | null;
};

export type BoardAlbum = {
  id: string;
  title: string;
  cover: string | null;
  photoCount: number;
  highlightCount: number;
  eventTitle: string | null;
  hasDriveUrl: boolean;
  createdLabel: string;
};

const CARD_PREVIEW = 6;
const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

const ARTICLE_MARK: Record<BoardArticle["status"], { label: string; tone: EventStatusTone }> = {
  draft: { label: "Draf", tone: "gold" },
  published: { label: "Terbit", tone: "jade" },
  archived: { label: "Arsip", tone: "neutral" },
};

function albumMark(album: BoardAlbum): { label: string; tone: EventStatusTone } {
  return album.highlightCount > 0 ? { label: "Tampil", tone: "jade" } : { label: "Belum ada sorotan", tone: "gold" };
}

function Cover({ src, title, sizes, muted }: { src: string | null; title: string; sizes: string; muted?: boolean }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-container-high" aria-hidden="true">
        <span className="text-headline-lg text-outline">{title.charAt(0)}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none ${
        muted ? "grayscale group-hover:grayscale-0" : ""
      }`}
    />
  );
}

/** Tombol "⋯" dengan menu aksi, sama dengan menu kartu Kegiatan. */
function CardMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    // z-index hanya saat terbuka: dialog konfirmasi hidup di dalam menu ini.
    <div ref={rootRef} className={`relative -mr-1.5 -mt-1 shrink-0 ${open ? "z-[60]" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Aksi untuk ${label}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background sm:h-9 sm:w-9"
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-outline-variant bg-surface-container-lowest p-1 shadow-[0_14px_40px_rgba(29,27,20,0.12)]">
          {children}
        </div>
      )}
    </div>
  );
}

const MENU_ITEM = "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-body-sm transition-colors";
const PLAIN_ITEM = `${MENU_ITEM} text-on-background hover:bg-surface-container-low`;
const DANGER_ITEM = `${MENU_ITEM} text-error hover:bg-error-container/30`;

function ArticleMenu({ article }: { article: BoardArticle }) {
  const archived = article.status === "archived";
  return (
    <CardMenu label={article.title}>
      {article.status === "published" && (
        <a href={`/news/${article.slug}`} target="_blank" rel="noopener noreferrer" className={PLAIN_ITEM}>
          <ExternalLink size={14} aria-hidden /> Buka Halaman Publik
        </a>
      )}
      <ConfirmButton
        title={archived ? "Pulihkan berita?" : "Arsipkan berita?"}
        message={
          archived
            ? `"${article.title}" akan kembali menjadi draf. Terbitkan lagi lewat halaman edit.`
            : `"${article.title}" akan disembunyikan dari halaman publik tapi tetap tersimpan di sini.`
        }
        confirmLabel={archived ? "Ya, pulihkan" : "Ya, arsipkan"}
        action={setNewsArticleStatus}
        payload={{ id: article.id, status: archived ? "draft" : "archived" }}
        danger={false}
        className={PLAIN_ITEM}
      >
        {archived ? "Pulihkan ke Draf" : "Arsipkan"}
      </ConfirmButton>
      <DeleteNewsButton id={article.id} label="Hapus Permanen" className={DANGER_ITEM} />
    </CardMenu>
  );
}

function ArticleMeta({ article }: { article: BoardArticle }) {
  return (
    <div className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
      <span className="flex items-start gap-1.5">
        <CalendarDays size={14} className="mt-1 shrink-0" aria-hidden />
        <span>{article.dateLabel}</span>
      </span>
      {article.author && (
        <span className="flex items-start gap-1.5">
          <PenLine size={14} className="mt-1 shrink-0" aria-hidden />
          <span className="line-clamp-1">{article.author}</span>
        </span>
      )}
    </div>
  );
}

function TitleLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded transition-colors after:absolute after:inset-0 after:rounded-lg group-hover:text-primary-container focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
    >
      {children}
    </Link>
  );
}

function ArticleCard({ article }: { article: BoardArticle }) {
  const mark = ARTICLE_MARK[article.status];
  return (
    <article className="group relative flex rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold sm:flex-col">
      <div className="relative w-24 shrink-0 overflow-hidden rounded-l-lg bg-surface-container-high sm:h-44 sm:w-full sm:rounded-l-none sm:rounded-t-lg">
        <Cover
          src={article.coverImageUrl}
          title={article.title}
          sizes="(max-width: 640px) 96px, (max-width: 1280px) 50vw, 33vw"
          muted={article.status === "archived"}
        />
        <div className="absolute left-3 top-3 hidden sm:block">
          <EventStatusMark label={mark.label} tone={mark.tone} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-5">
        <EventStatusMark label={mark.label} tone={mark.tone} bare className="self-start sm:hidden" />
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-headline-sm text-on-background">
            <TitleLink href={`/console/content/news/${article.id}`}>{article.title}</TitleLink>
          </h3>
          <ArticleMenu article={article} />
        </div>
        {article.category && <p className="text-body-sm text-on-surface-variant">{article.category}</p>}
        <ArticleMeta article={article} />
        {article.eventTitle && (
          <p className="mt-auto pt-2 text-body-sm text-on-background">Liputan acara {article.eventTitle}</p>
        )}
      </div>
    </article>
  );
}

function FeaturedArticleCard({ article }: { article: BoardArticle }) {
  const mark = ARTICLE_MARK[article.status];
  return (
    <article className="group relative grid grid-cols-1 rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold lg:grid-cols-12">
      <div className="relative h-56 overflow-hidden rounded-t-lg bg-surface-container-high sm:h-72 lg:col-span-6 lg:h-auto lg:min-h-[20rem] lg:rounded-l-lg lg:rounded-tr-none">
        <Cover src={article.coverImageUrl} title={article.title} sizes="(max-width: 1024px) 100vw, 50vw" />
        <EventStatusMark label={mark.label} tone={mark.tone} className="absolute left-4 top-4" />
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-8 lg:col-span-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-headline-sm sm:text-headline-md text-on-background">
              <TitleLink href={`/console/content/news/${article.id}`}>{article.title}</TitleLink>
            </h3>
            <ArticleMenu article={article} />
          </div>
          {article.category && <p className="text-body-md text-on-surface-variant">{article.category}</p>}
        </div>
        <ArticleMeta article={article} />
        {article.excerpt && <p className="line-clamp-3 text-body-md text-on-surface-variant">{article.excerpt}</p>}
        {article.eventTitle && <p className="mt-auto text-body-sm text-on-background">Liputan acara {article.eventTitle}</p>}
      </div>
    </article>
  );
}

function AlbumCard({ album }: { album: BoardAlbum }) {
  const mark = albumMark(album);
  return (
    <article className="group relative flex rounded-lg border border-outline-variant bg-surface-container-lowest transition-colors hover:border-muted-gold sm:flex-col">
      <div className="relative w-24 shrink-0 overflow-hidden rounded-l-lg bg-surface-container-high sm:aspect-video sm:w-full sm:rounded-l-none sm:rounded-t-lg">
        <Cover src={album.cover} title={album.title} sizes="(max-width: 640px) 96px, (max-width: 1280px) 50vw, 33vw" />
        <div className="absolute left-3 top-3 hidden sm:block">
          <EventStatusMark label={mark.label} tone={mark.tone} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-5">
        <EventStatusMark label={mark.label} tone={mark.tone} bare className="self-start sm:hidden" />
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-headline-sm text-on-background">
            <TitleLink href={`/console/content/gallery/${album.id}`}>{album.title}</TitleLink>
          </h3>
          <CardMenu label={album.title}>
            <a href={`/gallery/${album.id}`} target="_blank" rel="noopener noreferrer" className={PLAIN_ITEM}>
              <ExternalLink size={14} aria-hidden /> Buka Halaman Publik
            </a>
            <ConfirmButton
              onConfirm={() => deleteGalleryAlbum(album.id)}
              title="Hapus album?"
              message={`"${album.title}" beserta ${album.photoCount} fotonya dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
              confirmLabel="Ya, hapus album"
              className={DANGER_ITEM}
            >
              Hapus Album
            </ConfirmButton>
          </CardMenu>
        </div>
        {/* Album acara biasanya dinamai persis seperti acaranya; baris yang mengulang judul tidak menambah apa-apa. */}
        {album.eventTitle && album.eventTitle.trim().toLowerCase() !== album.title.trim().toLowerCase() && (
          <p className="text-body-sm text-on-surface-variant">Album acara {album.eventTitle}</p>
        )}
        <div className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
          <span className="flex items-start gap-1.5">
            <Images size={14} className="mt-1 shrink-0" aria-hidden />
            <span className="tabular-nums">
              {album.photoCount} foto · {album.highlightCount} sorotan
            </span>
          </span>
          <span className="flex items-start gap-1.5">
            <CalendarDays size={14} className="mt-1 shrink-0" aria-hidden />
            <span>Dibuat {album.createdLabel}</span>
          </span>
        </div>
        {!album.hasDriveUrl && <p className="mt-auto pt-2 text-body-sm text-gold-ink">Tautan album lengkap belum diisi</p>}
      </div>
    </article>
  );
}

function BoardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-headline-md text-on-background">{title}</h2>
      {children}
    </section>
  );
}

function CappedGrid<T extends { id: string }>({
  items,
  showAll,
  render,
}: {
  items: T[];
  showAll: boolean;
  render: (item: T) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = showAll || expanded ? items : items.slice(0, CARD_PREVIEW);
  return (
    <>
      <div className={GRID}>{shown.map(render)}</div>
      {shown.length < items.length && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start rounded-md border border-outline-variant px-4 py-2 text-label-caps uppercase tracking-wide text-on-background transition-colors hover:bg-surface-container-low"
        >
          Tampilkan Semua ({items.length})
        </button>
      )}
    </>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-outline-variant p-6 text-body-md text-on-surface-variant">{children}</p>;
}

const TABS: { key: ContentTab; label: string }[] = [
  { key: "berita", label: "Berita" },
  { key: "galeri", label: "Galeri" },
];

export function ContentBoard({
  articles,
  albums,
  initialTab,
}: {
  articles: BoardArticle[];
  albums: BoardAlbum[];
  initialTab: ContentTab;
}) {
  const [tab, setTab] = useState<ContentTab>(initialTab);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (...fields: (string | null)[]) => !needle || fields.filter(Boolean).join(" ").toLowerCase().includes(needle);

  const shownArticles = articles.filter((a) => matches(a.title, a.category, a.author, a.eventTitle));
  const shownAlbums = albums.filter((a) => matches(a.title, a.eventTitle));

  function chooseTab(next: ContentTab) {
    setTab(next);
    // Alamat ikut berganti, supaya kembali dari halaman album mendarat di tab Galeri lagi.
    window.history.replaceState(null, "", next === "galeri" ? "?tab=galeri" : window.location.pathname);
  }

  const counts: Record<ContentTab, number> = {
    berita: articles.filter((a) => a.status !== "archived").length,
    galeri: albums.length,
  };

  const drafts = shownArticles.filter((a) => a.status === "draft");
  const [latest, ...published] = shownArticles.filter((a) => a.status === "published");
  const archived = shownArticles.filter((a) => a.status === "archived");
  const withoutHighlights = albums.filter((a) => a.highlightCount === 0).length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:border-b sm:border-outline-variant">
        <div role="tablist" aria-label="Jenis konten" className="flex min-w-0 gap-1 border-b border-outline-variant sm:border-b-0">
          {TABS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={tab === option.key}
              onClick={() => chooseTab(option.key)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-label-caps uppercase tracking-wide transition-colors ${
                tab === option.key
                  ? "border-primary-container text-primary-container"
                  : "border-transparent text-on-surface-variant hover:text-on-background"
              }`}
            >
              {option.label} <span className="tabular-nums">{counts[option.key]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-md bg-soft-gray px-3 sm:w-72 sm:shrink-0">
          <Search size={15} className="shrink-0 text-on-surface-variant" aria-hidden />
          <span className="sr-only">{tab === "berita" ? "Cari berita" : "Cari album"}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "berita" ? "Cari judul, kategori, penulis" : "Cari judul album atau acara"}
            className="min-w-0 flex-1 bg-transparent py-2 text-body-sm placeholder:text-on-surface-variant focus:outline-none"
          />
        </label>
      </div>

      {tab === "berita" ? (
        articles.length === 0 ? (
          <EmptyNote>Belum ada berita. Mulai dari tombol Tulis Berita.</EmptyNote>
        ) : (
          <>
            {needle && shownArticles.length === 0 && <EmptyNote>Tidak ada berita yang cocok dengan &quot;{query.trim()}&quot;.</EmptyNote>}

            {drafts.length > 0 && (
              <BoardSection title="Draf">
                <CappedGrid items={drafts} showAll={!!needle} render={(a) => <ArticleCard key={a.id} article={a} />} />
              </BoardSection>
            )}

            {latest && (
              <BoardSection title="Terbaru">
                <FeaturedArticleCard article={latest} />
              </BoardSection>
            )}

            {published.length > 0 && (
              <BoardSection title="Sudah Terbit">
                <CappedGrid items={published} showAll={!!needle} render={(a) => <ArticleCard key={a.id} article={a} />} />
              </BoardSection>
            )}

            {archived.length > 0 && (
              <CollapsibleSection
                title={`Arsip (${archived.length})`}
                description="Berita lama yang sudah dipensiunkan. Tidak tampil di halaman publik."
                defaultOpen={!!needle}
              >
                <div className={GRID}>
                  {archived.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )
      ) : albums.length === 0 ? (
        <EmptyNote>Belum ada album. Mulai dari tombol Album Baru.</EmptyNote>
      ) : (
        <BoardSection title="Album Foto">
          {withoutHighlights > 0 && (
            <p className="-mt-2 max-w-[70ch] text-body-md text-on-surface-variant">
              <span className="text-gold-ink">
                {withoutHighlights} dari {albums.length} album belum punya foto sorotan
              </span>
              , jadi di situs albumnya tampil tanpa foto. Tandai sorotan dengan bintang di halaman album.
            </p>
          )}
          {shownAlbums.length === 0 ? (
            <EmptyNote>Tidak ada album yang cocok dengan &quot;{query.trim()}&quot;.</EmptyNote>
          ) : (
            <CappedGrid items={shownAlbums} showAll={!!needle} render={(a) => <AlbumCard key={a.id} album={a} />} />
          )}
        </BoardSection>
      )}
    </div>
  );
}
