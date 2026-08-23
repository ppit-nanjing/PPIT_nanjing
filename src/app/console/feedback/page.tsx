import { requireModuleAccess } from "@/lib/admin-scope";
import { listFeedback } from "@/app/actions/feedback";
import { FeedbackInbox, type FeedbackRow } from "@/components/feedback/feedback-inbox";
import { GuideButton } from "@/components/console/guide-button";
import { getGuide } from "@/lib/guides";

// /console is intentionally not named /admin (see docs/Information Architecture.md) to
// keep it off casual URL-guessing - the real gate is the session/scope check, not the name.
export default async function ConsoleFeedbackPage() {
  await requireModuleAccess("feedback");

  const rows = await listFeedback();
  const serialized: FeedbackRow[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    message: r.message,
    status: r.status,
    userEmail: r.userEmail,
    pagePath: r.pagePath,
    elementSelector: r.elementSelector,
    elementDescription: r.elementDescription,
    createdAt: r.createdAt.toISOString(),
  }));

  const guide = await getGuide("masukan");

  return (
    <div className="min-h-screen bg-background px-[var(--spacing-container-padding)] py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <h1 className="text-headline-md sm:text-headline-lg text-on-background">Masukan Pengguna</h1>
          {guide && <GuideButton title={guide.title} content={guide.content} docSlug="masukan" />}
        </div>
        <p className="text-body-md text-on-surface-variant mb-8">
          Semua masukan yang dikirim lewat widget umpan balik di seluruh halaman.
        </p>
        <FeedbackInbox initialRows={serialized} />
      </div>
    </div>
  );
}
