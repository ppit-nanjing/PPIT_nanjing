import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireModuleAccess } from "@/lib/admin-scope";
import { emailSenderStatus } from "@/lib/email";
import { upsertNewsArticle } from "@/app/actions/admin-content";
import { NewsArticleForm } from "@/components/console/news-article-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewNewsArticlePage() {
  await requireModuleAccess("content");
  const [{ value: subscriberCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.emailSubscribed, true), eq(users.status, "active")));
  const emailStatus = emailSenderStatus();

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <Link
        href="/console/content"
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali ke Konten
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-8">Tulis Berita Baru</h1>
      <CollapsibleSection title="Formulir Berita">
        <NewsArticleForm
          action={upsertNewsArticle.bind(null, null)}
          subscriberCount={subscriberCount}
          emailReady={emailStatus === "ready"}
          submitLabel="Simpan"
        />
      </CollapsibleSection>
    </div>
  );
}
