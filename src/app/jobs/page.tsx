import { and, count, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobPostings, careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { EXPIRED_VISIBLE_LIMIT, isJobExpired } from "@/lib/job-application";
import { Archive, Briefcase, MapPin, Search, SlidersHorizontal, BookOpen, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const TYPE_KEYS: Record<string, TKey> = {
  internship: "jobs.type.internship",
  full_time: "jobs.type.full_time",
  part_time: "jobs.type.part_time",
  volunteer: "jobs.type.volunteer",
};
type JobType = "internship" | "full_time" | "part_time" | "volunteer";
const TYPES = Object.keys(TYPE_KEYS) as JobType[];

function excerpt(content: string | null, length = 120): string {
  if (!content) return "";
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > length ? plain.slice(0, length).trim() + "…" : plain;
}

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("meta.jobsTitle"), description: t("meta.jobsDesc") };
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string | string[]; location?: string }>;
}) {
  const { q, type, location } = await searchParams;
  const { t } = await getT();
  const rawTypes = type ? (Array.isArray(type) ? type : [type]) : [];
  const selectedTypes = rawTypes.filter((t): t is JobType => (TYPES as string[]).includes(t));

  function typeLabel(key: string): string {
    const k = TYPE_KEYS[key];
    return k ? t(k) : key;
  }

  // Real filters over Drizzle, not the prototype's static/decorative checkboxes -
  // location options are derived from what's actually posted, not hardcoded
  // Nanjing/Shanghai/Remote placeholders.
  const conditions = [eq(jobPostings.status, "open")];
  if (q) conditions.push(or(ilike(jobPostings.title, `%${q}%`), ilike(jobPostings.company, `%${q}%`))!);
  if (selectedTypes.length > 0) conditions.push(inArray(jobPostings.type, selectedTypes));
  if (location) conditions.push(eq(jobPostings.location, location));

  const jobs = await db.select().from(jobPostings).where(and(...conditions));
  const allOpenJobs = await db.select({ location: jobPostings.location }).from(jobPostings).where(eq(jobPostings.status, "open"));
  const locations = [...new Set(allOpenJobs.map((j) => j.location).filter((l): l is string => !!l))];

  // Deadline ditegakkan: yang lewat batas dipisah, ditampilkan abu-abu sampai
  // EXPIRED_VISIBLE_LIMIT, sisanya hanya di /jobs/archive (bersama yang ditutup).
  const today = new Date().toISOString().slice(0, 10);
  const activeJobs = jobs.filter((j) => !isJobExpired(j.applicationDeadline));
  const visibleExpired = jobs
    .filter((j) => isJobExpired(j.applicationDeadline))
    // Paling baru kadaluarsa dulu; deadline selalu terisi di kelompok ini.
    .sort((a, b) => (b.applicationDeadline ?? "").localeCompare(a.applicationDeadline ?? ""))
    .slice(0, EXPIRED_VISIBLE_LIMIT);
  // Angka arsip global (tanpa filter pencarian): ditutup pengurus ATAU lewat batas.
  const [{ value: archiveCount }] = await db
    .select({ value: count() })
    .from(jobPostings)
    .where(
      or(
        eq(jobPostings.status, "closed"),
        and(eq(jobPostings.status, "open"), lt(jobPostings.applicationDeadline, today)),
      )!,
    );

  // Terbaru dulu, dan sampai 4 artikel (jumlah yang dulu tampil di /career).
  // published_at boleh NULL dan Postgres menaruh NULL di depan untuk DESC, jadi
  // NULLS LAST eksplisit (pola yang sama dengan daftar berita di console).
  const guides = await db
    .select()
    .from(careerGuideArticles)
    .orderBy(sql`${careerGuideArticles.publishedAt} desc nulls last`)
    .limit(4);

  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    selectedTypes.forEach((t) => params.append("type", t));
    if (location) params.set("location", location);
    for (const [key, value] of Object.entries(overrides)) {
      if (key === "type") continue; // handled below per-checkbox
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    return `?${params.toString()}`;
  }

  // Satu kartu untuk dua keadaan: aktif dan abu-abu (lewat batas). Poster tampil
  // sebagai thumbnail kecil kalau ada; kartu kadaluarsa tetap bisa dibuka untuk
  // dibaca tapi tidak bisa dilamar.
  function renderJobCard(j: (typeof jobs)[number], isExpired: boolean) {
    return (
      <a
        key={j.id}
        href={`/jobs/${j.id}`}
        aria-label={t("jobs.detailAria", { title: j.title, company: j.company })}
        className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest border rounded-lg p-6 transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
          isExpired
            ? "opacity-60 grayscale border-outline-variant"
            : "border-outline-variant hover:border-muted-gold hover:shadow-[0_10px_30px_rgba(29,27,20,0.10)]"
        }`}
      >
        <div className="flex items-start gap-4 min-w-0">
          {j.imageUrl && (
            <span className="relative hidden sm:block w-20 shrink-0 aspect-[3/4] overflow-hidden rounded-md border border-outline-variant bg-surface-container-low">
              <Image src={j.imageUrl} alt="" fill sizes="80px" className="object-cover" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-0.5 rounded">
                {typeLabel(j.type)}
              </span>
              <span className="text-label-caps text-secondary">{formatRelativeTime(j.createdAt, t)}</span>
            </div>
            <h2 className="text-headline-md text-on-background mb-1">{j.title}</h2>
            <p className="text-body-md text-on-surface-variant mb-2">{j.company}</p>
            {j.location && (
              <span className="flex items-center gap-1 text-label-caps text-secondary">
                <MapPin size={12} aria-hidden /> {j.location}
              </span>
            )}
          </div>
        </div>
        <span
          aria-hidden
          className={`shrink-0 text-label-caps uppercase tracking-wide px-5 py-2 rounded-md ${
            isExpired
              ? "border border-outline text-on-surface-variant"
              : "border border-primary-container text-primary-container group-hover:bg-primary-container group-hover:text-on-primary transition-colors"
          }`}
        >
          {isExpired ? t("jobs.expiredBadge") : t("jobs.viewDetail")}
        </span>
      </a>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader title={t("jobs.title")} intro={t("jobs.subtitle")}>
        <form action="/jobs" role="search" aria-label={t("jobs.searchAria")} className="w-full max-w-2xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} aria-hidden />
          <input
            name="q"
            defaultValue={q}
            aria-label={t("jobs.searchInputAria")}
            placeholder={t("jobs.searchPlaceholder")}
            className="w-full pl-12 pr-28 py-4 bg-surface-container-lowest border border-outline-variant rounded-md text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary text-label-caps uppercase px-5 py-2.5 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("nav.search")}
          </button>
        </form>
      </PageHeader>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside aria-label={t("jobs.filterAria")} className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-outline-variant pb-4">
            <SlidersHorizontal size={18} className="text-on-background" />
            <h2 className="text-headline-md text-on-background">{t("jobs.filterHeading")}</h2>
          </div>

          <div className="mb-8">
            <h3 className="text-label-caps uppercase text-on-surface-variant mb-3">{t("jobs.typeHeading")}</h3>
            <div className="flex flex-col gap-2">
              {TYPES.map((t) => {
                const nextTypes = selectedTypes.includes(t)
                  ? selectedTypes.filter((x) => x !== t)
                  : [...selectedTypes, t];
                const params = new URLSearchParams();
                if (q) params.set("q", q);
                nextTypes.forEach((x) => params.append("type", x));
                if (location) params.set("location", location);
                return (
                  <a
                    key={t}
                    href={`/jobs?${params.toString()}`}
                    aria-current={selectedTypes.includes(t) ? "true" : undefined}
                    className="flex items-center gap-2 text-body-md text-on-background hover:text-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedTypes.includes(t) ? "bg-primary-container border-primary-container" : "border-outline"
                      }`}
                    >
                      {selectedTypes.includes(t) && <span className="w-2 h-2 bg-on-primary rounded-sm" />}
                    </span>
                    {typeLabel(t)}
                  </a>
                );
              })}
            </div>
          </div>

          {locations.length > 0 && (
            <div>
              <h3 className="text-label-caps uppercase text-on-surface-variant mb-3">{t("jobs.locationHeading")}</h3>
              <div className="flex flex-col gap-2">
                {locations.map((loc) => (
                  <a
                    key={loc}
                    href={buildQuery({ location: location === loc ? undefined : loc })}
                    className={`flex items-center gap-2 text-body-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                      location === loc ? "text-primary-container font-medium" : "text-on-background hover:text-primary-container"
                    }`}
                  >
                    <MapPin size={14} /> {loc}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="lg:col-span-9 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <p className="text-label-caps uppercase tracking-wide text-on-surface-variant" aria-live="polite">
              {t("jobs.found", { count: activeJobs.length })}
            </p>
            {(q || selectedTypes.length > 0 || location) && (
              <Link
                href="/jobs"
                className="text-label-caps uppercase tracking-wide text-primary-container hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
              >
                {t("jobs.clearFilter")}
              </Link>
            )}
          </div>
          {activeJobs.length === 0 && visibleExpired.length === 0 ? (
            <div className="flex flex-col items-center text-center py-20 bg-surface-container-lowest border border-[var(--deco-line)] border-dashed rounded-lg px-6">
              <Briefcase className="text-outline-variant mb-4" size={40} aria-hidden />
              <h2 className="text-headline-md text-on-background mb-2">
                {q || selectedTypes.length > 0 || location ? t("jobs.emptyResultsTitle") : t("jobs.emptyTitle")}
              </h2>
              <p className="text-body-md text-on-surface-variant mb-6 max-w-sm">
                {q || selectedTypes.length > 0 || location
                  ? t("jobs.emptyResultsDesc")
                  : t("jobs.emptyDesc")}
              </p>
              {(q || selectedTypes.length > 0 || location) && (
                <Link
                  href="/jobs"
                  className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  {t("jobs.clearAllFilters")}
                </Link>
              )}
            </div>
          ) : (
            <>
              {activeJobs.map((j) => renderJobCard(j, false))}
              {visibleExpired.length > 0 && (
                <section className="mt-6 flex flex-col gap-4" aria-label={t("jobs.expiredHeading")}>
                  <h2 className="text-headline-md text-on-surface-variant border-t border-[var(--deco-line)] pt-8">
                    {t("jobs.expiredHeading")}
                  </h2>
                  {visibleExpired.map((j) => renderJobCard(j, true))}
                </section>
              )}
            </>
          )}
          {archiveCount > 0 && (
            <Link
              href="/jobs/archive"
              className="self-start inline-flex items-center gap-2 mt-2 text-label-caps uppercase tracking-wide text-on-surface-variant border border-outline-variant px-5 py-2.5 rounded-md hover:bg-surface-container-low hover:text-on-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <Archive size={14} aria-hidden /> {t("jobs.archiveLink", { count: archiveCount })}
            </Link>
          )}
        </div>
      </main>

      {/* Career Resources - inline per the prototype rather than link-out only, mirrors comprehensive_career_center_ppit_nanjing */}
      <section id="panduan" className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 border-t border-outline-variant pt-16">
        <h2 className="text-headline-lg text-on-background mb-8">{t("jobs.resourcesHeading")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guides.map((g) => (
            <a
              key={g.id}
              href={`/career/guide/${g.slug}`}
              className="flex items-start gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hover:border-muted-gold hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <BookOpen className="text-primary-container shrink-0" size={22} />
              <div>
                <h3 className="text-body-md font-semibold text-on-background mb-1">{g.title}</h3>
                {g.category && <p className="text-label-caps text-on-surface-variant mb-2">{g.category}</p>}
                {g.content && <p className="text-body-md text-on-surface-variant">{excerpt(g.content)}</p>}
              </div>
            </a>
          ))}
          <Link
            href="/career/mentorship"
            className="flex items-start gap-4 bg-primary-container/5 border border-primary-container/20 rounded-lg p-6 hover:bg-primary-container/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            <Users className="text-primary-container shrink-0" size={22} />
            <div>
              <h3 className="text-body-md font-semibold text-on-background mb-1">{t("jobs.mentorshipTitle")}</h3>
              <p className="text-label-caps text-on-surface-variant">{t("jobs.mentorshipDesc")}</p>
            </div>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
