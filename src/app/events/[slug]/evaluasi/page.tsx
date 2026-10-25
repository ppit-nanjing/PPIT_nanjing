import type { ReactNode } from "react";
import Link from "next/link";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Award, CheckCircle2, Lock } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates, coverageCities, eventEvaluations, eventRegistrations, events, sensusProfiles } from "@/db/schema";
import { qualifiesForParticipantCertificate } from "@/lib/certificate-eligibility";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { EventEvaluationForm } from "@/components/events/event-evaluation-form";
import { sortByCoverageOrder } from "@/lib/coverage-cities";
import { evaluationTemplateForSlug } from "@/lib/event-evaluation-template";
import { loadEvaluationQuestions } from "@/lib/event-evaluation-queries";
import { getT } from "@/lib/i18n/server";

// Halaman ini membaca sesi (acara bersertifikat wajib login), jadi selalu dinamis.
export const dynamic = "force-dynamic";

const LINK_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-label-caps uppercase tracking-wide bg-accent text-on-accent hover:brightness-95 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function InfoCard({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center gap-4 text-center">
      {icon}
      <h2 className="text-headline-md text-on-background">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-md">{body}</p>
      {children}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const [event] = await db.select({ title: events.title }).from(events).where(and(eq(events.slug, slug), isNull(events.deletedAt)));
  return { title: t("eval.metaTitle", { event: event?.title ?? slug }) };
}

export default async function EventEvaluationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();

  const [event] = await db.select().from(events).where(and(eq(events.slug, slug), isNull(events.deletedAt)));
  if (!event || event.status === "draft" || event.status === "scheduled") notFound();

  // Kota (urutan kanonik) dan pertanyaan buatan panitia tidak saling bergantung.
  const [cityRowsRaw, customQuestions] = await Promise.all([
    db.select({ label: coverageCities.label }).from(coverageCities),
    loadEvaluationQuestions(event.id),
  ]);
  const cityOptions = sortByCoverageOrder(cityRowsRaw, (row) => row.label).map((c) => c.label);

  // Acara yang memberi e-sertifikat peserta: evaluasi diisi dengan akun, karena
  // sertifikat hanya untuk yang hadir (QR di-scan) DAN sudah mengisi evaluasi.
  let body: ReactNode = null;
  let certificateNote: string | null = null;
  let defaultName: string | undefined;
  if (event.certificateForParticipants) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      body = (
        <InfoCard
          icon={<Lock className="text-on-surface-variant" size={32} aria-hidden="true" />}
          title={t("eval.certLoginTitle")}
          body={event.certificateRequiresAttendance ? t("eval.certLoginBody") : t("eval.certLoginBodyNoQr")}
        >
          <Link href={`/login?returnTo=/events/${encodeURIComponent(event.slug)}/evaluasi`} className={LINK_BTN}>
            {t("ceval.loginButton")}
          </Link>
        </InfoCard>
      );
    } else {
      const [[mine], [reg], [cert], [profile]] = await Promise.all([
        db
          .select({ id: eventEvaluations.id })
          .from(eventEvaluations)
          .where(
            and(
              eq(eventEvaluations.eventId, event.id),
              eq(eventEvaluations.userId, userId),
              eq(eventEvaluations.audience, "peserta"),
            ),
          )
          .limit(1),
        db
          .select({ status: eventRegistrations.status })
          .from(eventRegistrations)
          .where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.userId, userId)))
          .limit(1),
        db
          .select({ id: certificates.id })
          .from(certificates)
          .where(
            and(
              eq(certificates.eventId, event.id),
              eq(certificates.userId, userId),
              eq(certificates.kind, "peserta"),
              isNotNull(certificates.fileUrl),
            ),
          )
          .limit(1),
        db
          .select({ fullName: sensusProfiles.fullName })
          .from(sensusProfiles)
          .where(eq(sensusProfiles.userId, userId))
          .limit(1),
      ]);
      defaultName = profile?.fullName?.trim() || session?.user?.name?.trim() || undefined;
      // Berhak = tercatat hadir (acara dengan QR) atau cukup terdaftar (acara tanpa QR).
      const eligible = !!reg && qualifiesForParticipantCertificate(reg.status, event.certificateRequiresAttendance);
      const statusText = cert
        ? t("eval.certIssued")
        : eligible
          ? t("eval.certPending")
          : event.certificateRequiresAttendance
            ? t("eval.certNotAttended")
            : t("eval.certNotRegistered");
      if (mine) {
        body = (
          <InfoCard
            icon={<CheckCircle2 className="text-primary-container" size={40} aria-hidden="true" />}
            title={t("eval.recordedTitle")}
            body={statusText}
          >
            {cert && (
              <Link href="/profile#aktivitas" className={LINK_BTN}>
                <Award size={16} aria-hidden="true" /> {t("eval.certOpen")}
              </Link>
            )}
          </InfoCard>
        );
      } else {
        certificateNote = eligible
          ? event.certificateRequiresAttendance
            ? t("eval.certNoteAttended")
            : t("eval.certNoteRegistered")
          : event.certificateRequiresAttendance
            ? t("eval.certNoteNotAttended")
            : t("eval.certNoteNotRegistered");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader eyebrow={t("eval.kicker")} title={t("eval.title", { event: event.title })} intro={t("eval.intro")} />

      <main className="max-w-3xl mx-auto px-[var(--spacing-container-padding)] py-12 pb-20">
        {body ?? (
          <div className="flex flex-col gap-5">
            {certificateNote && (
              <p
                role="note"
                className="flex items-start gap-2 rounded-lg border border-primary-container/40 bg-primary-container/10 px-4 py-3 text-body-md text-on-background"
              >
                <Award size={18} className="shrink-0 mt-0.5 text-primary-container" aria-hidden="true" />
                {certificateNote}
              </p>
            )}
            <EventEvaluationForm
              slug={event.slug}
              eventTitle={event.title}
              cityOptions={cityOptions}
              sections={evaluationTemplateForSlug(event.slug).sections}
              questions={customQuestions}
              linkedAccount={event.certificateForParticipants}
              allowAnonymous={event.evaluationAllowsAnonymous}
              defaultName={defaultName}
            />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
