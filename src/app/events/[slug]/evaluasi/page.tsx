import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { coverageCities, events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { EventEvaluationForm } from "@/components/events/event-evaluation-form";
import { sortByCoverageOrder } from "@/lib/coverage-cities";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.slug, slug));
  return { title: t("eval.metaTitle", { event: event?.title ?? slug }) };
}

export default async function EventEvaluationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event || event.status === "draft" || event.status === "scheduled") notFound();

  const cityRows = sortByCoverageOrder(
    await db.select({ label: coverageCities.label }).from(coverageCities),
    (row) => row.label,
  );
  const cityOptions = cityRows.map((c) => c.label);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader eyebrow={t("eval.kicker")} title={t("eval.title", { event: event.title })} intro={t("eval.intro")} />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-12 pb-20">
        <EventEvaluationForm
          slug={event.slug}
          eventTitle={event.title}
          cityOptions={cityOptions}
          sections={evaluationTemplateForSlug(event.slug).sections}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
