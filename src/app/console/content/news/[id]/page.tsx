import { and, count, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { newsArticles, users } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { getEventAccess } from "@/lib/event-access";
import { emailSenderStatus } from "@/lib/email";
import { upsertNewsArticle, setNewsArticleStatus } from "@/app/actions/admin-content";
import { NewsArticleForm } from "@/components/console/news-article-form";
import { ConfirmButton } from "@/components/console/confirm-button";
import { DeleteNewsButton } from "@/components/console/delete-news-button";
import { getSiteUrl } from "@/lib/site-url";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Dipublikasikan",
  archived: "Arsip",
};

export default async function EditNewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
  if (!article) notFound();

  // Modul Konten kabinet ATAU panitia dengan grant "Post artikel" untuk acara
  // yang artikel ini liput.
  const session = await auth();
  if (!session) redirect("/login");
  let allowed = hasModuleAccess(session.user.adminScope ?? null, "content");
  if (!allowed && article.eventId) {
    allowed = (await getEventAccess(article.eventId)).can("event.postArticle");
  }
  if (!allowed) redirect("/console");
  const backHref =
    !hasModuleAccess(session.user.adminScope ?? null, "content") && article.eventId
      ? `/console/events/${article.eventId}`
      : "/console/content";
  const [{ value: subscriberCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.emailSubscribed, true), eq(users.status, "active")));
  const emailStatus = emailSenderStatus();
  const isArchived = article.status === "archived";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>
        {article.status === "published" && (
          <a
            href={`${getSiteUrl()}/news/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors"
          >
            Lihat publik <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Edit Berita</h1>
          <span className="text-label-caps uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
            {STATUS_LABEL[article.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isArchived ? (
            <ConfirmButton
              title="Pulihkan berita?"
              message="Berita akan kembali menjadi draf. Publikasikan lagi dengan mencentang “Publikasikan” di bawah."
              confirmLabel="Ya, pulihkan"
              action={setNewsArticleStatus}
              payload={{ id: article.id, status: "draft" }}
              danger={false}
              className="text-label-caps uppercase tracking-wide px-3 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Pulihkan
            </ConfirmButton>
          ) : (
            <ConfirmButton
              title="Arsipkan berita?"
              message="Berita akan disembunyikan dari halaman publik tapi tetap tersimpan di sini."
              confirmLabel="Ya, arsipkan"
              action={setNewsArticleStatus}
              payload={{ id: article.id, status: "archived" }}
              danger={false}
              className="text-label-caps uppercase tracking-wide px-3 py-2 rounded-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Arsipkan
            </ConfirmButton>
          )}
          <DeleteNewsButton id={article.id} />
        </div>
      </div>

      <NewsArticleForm
        action={upsertNewsArticle.bind(null, article.id)}
        initial={{
          title: article.title,
          coverImageUrl: article.coverImageUrl ?? "",
          category: article.category ?? "",
          content: article.content ?? "",
          published: article.status === "published",
          archived: isArchived,
        }}
        subscriberCount={subscriberCount}
        emailReady={emailStatus === "ready"}
        submitLabel="Simpan Perubahan"
        eventId={article.eventId ?? undefined}
      />
    </div>
  );
}
