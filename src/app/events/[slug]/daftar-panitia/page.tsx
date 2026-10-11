import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, Lock } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventRecruitmentApplications, eventRecruitmentQuestions, events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { RecruitmentForm } from "@/components/events/recruitment-form";
import type { RecruitQuestionRow } from "@/lib/event-recruitment-questions";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.slug, slug));
  return { title: t("recruit.metaTitle", { event: event?.title ?? slug }) };
}

export default async function RecruitmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  if (!event || event.status === "cancelled") notFound();

  let body: React.ReactNode;

  if (!event.recruitEnabled) {
    body = (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
        <Lock className="text-on-surface-variant" size={32} aria-hidden="true" />
        <h2 className="text-headline-md text-on-background">{t("recruit.closedTitle")}</h2>
        <p className="text-body-md text-on-surface-variant max-w-md">{t("recruit.closedBody")}</p>
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t("recruit.backToEvent")}
        </Link>
      </div>
    );
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      body = (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
          <Lock className="text-on-surface-variant" size={32} aria-hidden="true" />
          <h2 className="text-headline-md text-on-background">{t("recruit.loginTitle")}</h2>
          <p className="text-body-md text-on-surface-variant max-w-md">{t("recruit.loginBody")}</p>
          <Link
            href={`/login?returnTo=/events/${encodeURIComponent(slug)}/daftar-panitia`}
            className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide bg-accent text-on-accent hover:brightness-95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("recruit.loginButton")}
          </Link>
        </div>
      );
    } else {
      const [existing] = await db
        .select({ id: eventRecruitmentApplications.id })
        .from(eventRecruitmentApplications)
        .where(
          and(
            eq(eventRecruitmentApplications.eventId, event.id),
            eq(eventRecruitmentApplications.userId, session.user.id),
          ),
        );

      if (existing) {
        body = (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
            <h2 className="text-headline-md text-on-background">{t("recruit.alreadyTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-md">{t("recruit.alreadyBody")}</p>
            <Link
              href={`/events/${slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("recruit.backToEvent")}
            </Link>
          </div>
        );
      } else {
        const questions = await db
          .select()
          .from(eventRecruitmentQuestions)
          .where(eq(eventRecruitmentQuestions.eventId, event.id))
          .orderBy(eventRecruitmentQuestions.orderIndex);

        body = <RecruitmentForm slug={slug} eventTitle={event.title} questions={questions as RecruitQuestionRow[]} />;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <PageHeader eyebrow={t("recruit.kicker")} title={t("recruit.title", { event: event.title })} intro={t("recruit.intro")} />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] pb-20">{body}</main>
      <SiteFooter />
    </div>
  );
}