import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CalendarClock, CheckCircle2, Lock } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { eventCommittee, eventDivisions, eventEvaluations, events } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { EventEvaluationForm } from "@/components/events/event-evaluation-form";
import { submitCommitteeEvaluation } from "@/app/actions/committee-evaluation";
import { committeeEvalTemplateQuestions, committeeEvalWindowState } from "@/lib/committee-evaluation";
import { loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";

// Evaluasi panitia per-acara. force-dynamic WAJIB: status jendela (buka/tutup)
// dihitung dari waktu saat ini, dan halaman ini juga membaca sesi login.
export const dynamic = "force-dynamic";

function LockCard({
  icon,
  title,
  body,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
      {icon}
      <h2 className="text-headline-md text-on-background">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-md">{body}</p>
      {hint && <p className="text-body-sm text-on-surface-variant max-w-md">{hint}</p>}
      {children}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.slug, slug));
  return { title: t("ceval.metaTitle", { event: event?.title ?? slug }) };
}

export default async function CommitteeEvaluationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, locale } = await getT();

  const [event] = await db.select().from(events).where(eq(events.slug, slug));
  // Acara dibatalkan tidak layak dievaluasi (K4) — sama dengan gerbang aksinya.
  if (!event || event.status === "draft" || event.status === "scheduled" || event.status === "cancelled") notFound();

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "full", timeStyle: "short" }).format(date);

  const windowState = committeeEvalWindowState(event.committeeEvalOpensAt, event.committeeEvalClosesAt);

  let body: ReactNode;
  if (windowState === "not-configured") {
    body = (
      <LockCard
        icon={<Lock className="text-on-surface-variant" size={32} aria-hidden="true" />}
        title={t("ceval.lockedNotConfiguredTitle")}
        body={t("ceval.lockedNotConfiguredBody")}
      />
    );
  } else if (windowState === "before") {
    body = (
      <LockCard
        icon={<CalendarClock className="text-on-surface-variant" size={32} aria-hidden="true" />}
        title={t("ceval.lockedBeforeTitle")}
        body={t("ceval.lockedBeforeBody", { datetime: formatDateTime(event.committeeEvalOpensAt as Date) })}
        hint={t("ceval.lockedClosedHint")}
      />
    );
  } else if (windowState === "closed") {
    body = (
      <LockCard
        icon={<Lock className="text-on-surface-variant" size={32} aria-hidden="true" />}
        title={t("ceval.lockedClosedTitle")}
        body={t("ceval.lockedClosedBody")}
      />
    );
  } else {
    // Jendela terbuka: identitas & hak pengisi diverifikasi di server.
    const session = await auth();
    if (!session?.user?.id) {
      body = (
        <LockCard
          icon={<Lock className="text-on-surface-variant" size={32} aria-hidden="true" />}
          title={t("ceval.loginTitle")}
          body={t("ceval.loginBody")}
        >
          <Link
            href={`/login?returnTo=/events/${encodeURIComponent(slug)}/evaluasi-panitia`}
            className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide bg-accent text-on-accent hover:brightness-95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("ceval.loginButton")}
          </Link>
        </LockCard>
      );
    } else {
      const [membership] = await db
        .select({ divisionName: eventDivisions.name })
        .from(eventCommittee)
        .leftJoin(eventDivisions, eq(eventCommittee.divisionId, eventDivisions.id))
        .where(and(eq(eventCommittee.eventId, event.id), eq(eventCommittee.userId, session.user.id)));

      if (!membership) {
        body = (
          <LockCard
            icon={<Lock className="text-on-surface-variant" size={32} aria-hidden="true" />}
            title={t("ceval.notCommitteeTitle")}
            body={t("ceval.notCommitteeBody", { event: event.title })}
          />
        );
      } else {
        const [existing] = await db
          .select({ id: eventEvaluations.id })
          .from(eventEvaluations)
          .where(
            and(
              eq(eventEvaluations.eventId, event.id),
              eq(eventEvaluations.userId, session.user.id),
              eq(eventEvaluations.audience, "panitia"),
            ),
          );

        if (existing) {
          body = (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />
              <h2 className="text-headline-md text-on-background">{t("ceval.alreadyTitle")}</h2>
              <p className="text-body-md text-on-surface-variant max-w-md">{t("ceval.alreadyBody")}</p>
              <Link
                href={`/events/${slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide border border-outline-variant text-on-background hover:bg-surface-container-low transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t("ceval.backToEvent")}
              </Link>
            </div>
          );
        } else {
          // Pertanyaan audiens panitia; kosong = template kolektif bawaan yang
          // isinya sama dengan template di committee-evaluation.ts.
          const customQuestions = await loadEvaluationQuestions(event.id, "panitia");
          body = (
            <EventEvaluationForm
              slug={slug}
              eventTitle={event.title}
              cityOptions={[]}
              sections={[]}
              questions={customQuestions.length > 0 ? customQuestions : committeeEvalTemplateQuestions()}
              audience="panitia"
              action={submitCommitteeEvaluation}
              userName={session.user.name ?? t("ceval.fallbackUserName")}
              divisionName={membership.divisionName}
            />
          );
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />
      <PageHeader eyebrow={t("ceval.kicker")} title={t("ceval.title", { event: event.title })} intro={t("ceval.intro")} />
      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] pb-20">{body}</main>
      <SiteFooter />
    </div>
  );
}
