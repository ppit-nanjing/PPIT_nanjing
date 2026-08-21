import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventRegistrations, events, borrowRequests, inventoryItems, jobApplications, jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CalendarDays, Package, Briefcase, Inbox } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import type { T } from "@/lib/i18n/translate";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-surface-container-low text-on-surface-variant",
  confirmed: "bg-primary-container/10 text-primary-container",
  attended: "bg-primary-container/10 text-primary-container",
  approved: "bg-primary-container/10 text-primary-container",
  rejected: "bg-error-container text-on-error-container",
  cancelled: "bg-error-container text-on-error-container",
  returned: "bg-surface-container-low text-on-surface-variant",
  overdue: "bg-error-container text-on-error-container",
  borrowed: "bg-primary-container/10 text-primary-container",
  submitted: "bg-surface-container-low text-on-surface-variant",
  under_review: "bg-primary-container/10 text-primary-container",
  interview: "bg-primary-container/10 text-primary-container",
  offered: "bg-primary-container/10 text-primary-container",
};

// The raw enum value was rendered straight to the page, so members saw
// "under_review" / "pending" instead of readable text. Unknown values fall back
// to a de-underscored version rather than disappearing.
const STATUS_KEY: Record<string, TKey> = {
  pending: "submissions.status.pending",
  confirmed: "submissions.status.confirmed",
  attended: "submissions.status.attended",
  approved: "submissions.status.approved",
  rejected: "submissions.status.rejected",
  cancelled: "submissions.status.cancelled",
  returned: "submissions.status.returned",
  overdue: "submissions.status.overdue",
  borrowed: "submissions.status.borrowed",
  submitted: "submissions.status.submitted",
  under_review: "submissions.status.under_review",
  interview: "submissions.status.interview",
  offered: "submissions.status.offered",
};

const KIND_KEY = {
  event: "submissions.kind.event",
  borrow: "submissions.kind.borrow",
  job: "submissions.kind.job",
} as const satisfies Record<string, TKey>;

function statusLabel(t: T, status: string): string {
  const key = STATUS_KEY[status];
  return key ? t(key) : status.replace(/_/g, " ");
}

export default async function SubmissionHistoryPage() {
  const { t, locale } = await getT();
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?returnTo=${encodeURIComponent("/profile/submissions")}`);
  const userId = session.user.id;

  // Cross-domain view (docs/Screens/Public/Event Flow.md) - union of everything
  // this user has submitted, most recent first, no dedicated table of its own.
  const [eventRows, borrowRows, jobRows] = await Promise.all([
    db
      .select({ reg: eventRegistrations, eventTitle: events.title, eventSlug: events.slug })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(eq(eventRegistrations.userId, userId)),
    db
      .select({ req: borrowRequests, itemName: inventoryItems.name })
      .from(borrowRequests)
      .innerJoin(inventoryItems, eq(borrowRequests.itemId, inventoryItems.id))
      .where(eq(borrowRequests.userId, userId)),
    db
      .select({ app: jobApplications, jobTitle: jobPostings.title, jobId: jobPostings.id })
      .from(jobApplications)
      .innerJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
      .where(eq(jobApplications.userId, userId)),
  ]);

  const items = [
    ...eventRows.map((r) => ({
      kind: "event" as const,
      id: r.reg.id,
      title: r.eventTitle,
      status: r.reg.status,
      date: r.reg.registeredAt,
      href: `/events/${r.eventSlug}`,
    })),
    ...borrowRows.map((r) => ({
      kind: "borrow" as const,
      id: r.req.id,
      title: r.itemName,
      status: r.req.status,
      date: r.req.requestedAt,
      href: "/inventory",
    })),
    ...jobRows.map((r) => ({
      kind: "job" as const,
      id: r.app.id,
      title: r.jobTitle,
      status: r.app.status,
      date: r.app.appliedAt,
      href: `/jobs/${r.jobId}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const ICON = { event: CalendarDays, borrow: Package, job: Briefcase };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <main className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] py-16">
        <h1 className="text-headline-lg text-on-background mb-2">{t("submissions.title")}</h1>
        <p className="text-body-md text-on-surface-variant mb-10">
          {t("submissions.desc")}
        </p>

        {items.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-24">
            <Inbox className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">{t("submissions.empty")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
              {t("submissions.emptyDesc")}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/events"
                className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {t("submissions.viewEvents")}
              </Link>
              <Link
                href="/inventory"
                className="border border-outline-variant text-on-background text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {t("submissions.viewInventory")}
              </Link>
            </div>
          </div>
        ) : (
          <ul aria-label={t("submissions.listAria")} className="flex flex-col gap-3">
            {items.map((item) => {
              const Icon = ICON[item.kind];
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    aria-label={t("submissions.itemAria", {
                      kind: t(KIND_KEY[item.kind]),
                      title: item.title,
                      status: statusLabel(t, item.status),
                    })}
                    className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    <Icon className="text-secondary shrink-0" size={20} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-label-caps text-on-surface-variant uppercase">
                        {t(KIND_KEY[item.kind])}
                      </p>
                      <p className="text-body-md font-medium text-on-background truncate">{item.title}</p>
                      {/* The date was computed for sorting but never shown - on a
                          history page it is the thing that orders the list. */}
                      <time
                        dateTime={item.date.toISOString()}
                        className="text-label-caps text-on-surface-variant"
                      >
                        {item.date.toLocaleDateString(INTL_LOCALE[locale], {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <span
                      className={`text-label-caps uppercase tracking-wide px-2.5 py-1 rounded shrink-0 ${STATUS_STYLE[item.status] ?? "bg-surface-container-low text-on-surface-variant"}`}
                    >
                      {statusLabel(t, item.status)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
