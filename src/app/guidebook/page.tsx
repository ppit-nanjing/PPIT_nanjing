import { and, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { guidebookProgress, helpArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { ProgressToggleButton } from "@/components/guidebook/progress-toggle";
import { toggleGuideProgressAction } from "@/app/actions/guidebook-progress";
import { GUIDE_PHASES, expiryStatus } from "@/lib/guidebook-topic";
import { getT } from "@/lib/i18n/server";

/**
 * Urutan langkah maba (docs/Guidebook Maba.md): satu topik per baris, dikelompokkan
 * per fase (sebelum berangkat sampai bulan pertama). Isi topiknya sendiri tetap
 * di artikel Help Center - halaman ini cuma daftar urut plus centang progres.
 *
 * Halaman ini juga satu-satunya tempat yang jujur soal keadaan korpus: topik
 * yang belum ditinjau pengurus atau sudah lewat masa berlaku ditandai di sini,
 * karena asisten AI sengaja tidak memakai keduanya.
 */
export default async function GuidebookPage() {
  const { t } = await getT();
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const topics = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      slug: helpArticles.slug,
      phase: helpArticles.phase,
      sourceLabel: helpArticles.sourceLabel,
      reviewedAt: helpArticles.reviewedAt,
      expiresAt: helpArticles.expiresAt,
    })
    .from(helpArticles)
    .where(and(isNotNull(helpArticles.phase), eq(helpArticles.isPublic, true)))
    .orderBy(helpArticles.sortOrder, helpArticles.title);

  const done = userId
    ? new Set(
        (
          await db
            .select({ articleId: guidebookProgress.articleId })
            .from(guidebookProgress)
            .where(eq(guidebookProgress.userId, userId))
        ).map((r) => r.articleId),
      )
    : new Set<string>();

  const doneCount = topics.filter((topic) => done.has(topic.id)).length;
  const total = topics.length;
  const byPhase = GUIDE_PHASES.map((phase) => ({
    phase,
    items: topics.filter((topic) => topic.phase === phase.value),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader title={t("guidebook.title")} intro={t("guidebook.intro")} />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 pt-12">
        {total === 0 ? (
          <p className="text-body-md text-on-surface-variant text-center py-24">{t("guidebook.empty")}</p>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              {userId ? (
                <div className="flex flex-col gap-2">
                  <p className="text-label-caps uppercase tracking-[0.2em] text-gold-ink">
                    {t("guidebook.progress", { done: doneCount, total })}
                  </p>
                  <div
                    className="h-1.5 rounded-full bg-surface-container-high overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={doneCount}
                    aria-label={t("guidebook.progress", { done: doneCount, total })}
                  >
                    <div
                      className="h-full bg-primary transition-[width] motion-reduce:transition-none"
                      style={{ width: `${total === 0 ? 0 : Math.round((doneCount / total) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">
                  {t("guidebook.anonymous")}{" "}
                  <Link
                    href="/login?returnTo=/guidebook"
                    className="text-primary-container underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                  >
                    {t("guidebook.anonymousCta")}
                  </Link>
                </p>
              )}
              <p className="text-body-sm text-on-surface-variant">
                {t("guidebook.chatHint")}{" "}
                <Link
                  href="/help"
                  className="inline-flex items-center gap-1 text-primary-container underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                >
                  {t("guidebook.chatHintCta")}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </p>
            </div>

            {byPhase.map(({ phase, items }) => (
              <section key={phase.value} className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4 border-b border-outline-variant pb-2">
                  <h2 className="text-headline-sm text-heading">{phase.label}</h2>
                  <p className="text-body-sm text-on-surface-variant shrink-0">
                    {t("guidebook.phaseProgress", {
                      done: items.filter((topic) => done.has(topic.id)).length,
                      total: items.length,
                    })}
                  </p>
                </div>

                <ul className="flex flex-col gap-3">
                  {items.map((topic) => {
                    const expired = expiryStatus(topic.expiresAt) === "expired";
                    const unreviewed = !topic.reviewedAt;
                    return (
                      <li
                        key={topic.id}
                        className="flex items-start gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg px-5 py-4"
                      >
                        {userId && !expired && (
                          <form action={toggleGuideProgressAction} className="pt-0.5">
                            <input type="hidden" name="articleId" value={topic.id} />
                            <input type="hidden" name="done" value={done.has(topic.id) ? "false" : "true"} />
                            <ProgressToggleButton
                              checked={done.has(topic.id)}
                              label={done.has(topic.id) ? t("guidebook.markUndone") : t("guidebook.markDone")}
                            />
                          </form>
                        )}
                        <div className="flex flex-col gap-1 min-w-0">
                          <Link
                            href={`/help/${topic.slug}`}
                            className="text-body-md text-on-background hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                          >
                            {topic.title}
                          </Link>
                          <p className="text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1">
                            {topic.sourceLabel && <span>{topic.sourceLabel}</span>}
                            {expired ? (
                              <span className="text-error">{t("guidebook.reviewing")}</span>
                            ) : (
                              unreviewed && <span className="text-gold-ink">{t("guidebook.unreviewed")}</span>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
