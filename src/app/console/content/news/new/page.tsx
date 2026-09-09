import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { hasModuleAccess } from "@/lib/admin-scope";
import { getEventAccess } from "@/lib/event-access";
import { emailSenderStatus } from "@/lib/email";
import { upsertNewsArticle } from "@/app/actions/admin-content";
import { NewsArticleForm } from "@/components/console/news-article-form";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewNewsArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId: eventIdRaw } = await searchParams;
  const eventId = eventIdRaw?.trim() || null;

  // Modul Konten kabinet ATAU panitia dengan grant "Post artikel" untuk acara
  // di ?eventId (artikelnya akan tertaut ke situ).
  const session = await auth();
  if (!session) redirect("/login");
  const hasContent = hasModuleAccess(session.user.adminScope ?? null, "content");
  let scopedEventId: string | null = null;
  if (!hasContent) {
    if (!eventId || !(await getEventAccess(eventId)).can("event.postArticle")) redirect("/console");
    scopedEventId = eventId;
  }

  const [{ value: subscriberCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.emailSubscribed, true), eq(users.status, "active")));
  const emailStatus = emailSenderStatus();

  // Untuk konten kabinet, ?eventId opsional — cek acaranya ada supaya form tidak
  // membawa id ngawur.
  let taggedEvent: { id: string; title: string } | null = null;
  if (eventId) {
    const [ev] = await db.select({ id: events.id, title: events.title }).from(events).where(eq(events.id, eventId));
    taggedEvent = ev ?? null;
  }
  const backHref = scopedEventId ? `/console/events/${scopedEventId}` : "/console/content";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10 max-w-2xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-label-caps uppercase tracking-wide text-on-surface-variant hover:text-on-background mb-4"
      >
        <ArrowLeft size={16} /> Kembali
      </Link>
      <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Tulis Berita Baru</h1>
      {taggedEvent && (
        <p className="text-body-md text-on-surface-variant mb-6">Artikel acara: {taggedEvent.title}</p>
      )}
      <CollapsibleSection title="Formulir Berita">
        <NewsArticleForm
          action={upsertNewsArticle.bind(null, null)}
          subscriberCount={subscriberCount}
          emailReady={emailStatus === "ready"}
          submitLabel="Simpan"
          eventId={(scopedEventId ?? (taggedEvent ? taggedEvent.id : undefined)) || undefined}
        />
      </CollapsibleSection>
    </div>
  );
}
