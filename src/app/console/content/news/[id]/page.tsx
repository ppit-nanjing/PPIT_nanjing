import { and, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { newsArticles, users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { emailSenderStatus } from "@/lib/email";
import { upsertNewsArticle } from "@/app/actions/admin-content";
import { NewsArticleForm } from "@/components/console/news-article-form";
import { getSiteUrl } from "@/lib/site-url";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function EditNewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("content");
  const { id } = await params;
  const [article] = await db.select().from(newsArticles).where(eq(newsArticles.id, id));
  if (!article) notFound();
  const [{ value: subscriberCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.emailSubscribed, true), eq(users.status, "active")));
  const emailStatus = emailSenderStatus();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/console/content"
          className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background"
        >
          <ArrowLeft size={16} /> Kembali ke Konten
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
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Edit Berita</h1>
      <NewsArticleForm
        action={upsertNewsArticle.bind(null, article.id)}
        initial={{
          title: article.title,
          coverImageUrl: article.coverImageUrl ?? "",
          category: article.category ?? "",
          content: article.content ?? "",
          published: article.status === "published",
        }}
        subscriberCount={subscriberCount}
        emailReady={emailStatus === "ready"}
        submitLabel="Simpan Perubahan"
      />
    </div>
  );
}
