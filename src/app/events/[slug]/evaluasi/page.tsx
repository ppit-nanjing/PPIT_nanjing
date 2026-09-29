import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { coverageCities, events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { EventEvaluationForm } from "@/components/events/event-evaluation-form";
import { sortByCoverageOrder } from "@/lib/coverage-cities";
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

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("eval.kicker")}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background text-balance mb-4">
          {t("eval.title", { event: event.title })}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl text-pretty">{t("eval.intro")}</p>
      </header>

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] pb-20">
        <EventEvaluationForm slug={event.slug} eventTitle={event.title} cityOptions={cityOptions} />
      </main>

      <SiteFooter />
    </div>
  );
}
