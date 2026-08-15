import { eq, and, ilike, or, inArray } from "drizzle-orm";
import { db } from "@/db";
import { jobPostings, careerGuideArticles } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { Briefcase, MapPin, Search, SlidersHorizontal, BookOpen, Users } from "lucide-react";

const TYPE_LABEL = {
  internship: "Magang",
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
} as const;
type JobType = keyof typeof TYPE_LABEL;
const TYPES = Object.keys(TYPE_LABEL) as JobType[];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string | string[]; location?: string }>;
}) {
  const { q, type, location } = await searchParams;
  const rawTypes = type ? (Array.isArray(type) ? type : [type]) : [];
  const selectedTypes = rawTypes.filter((t): t is JobType => (TYPES as string[]).includes(t));

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

  const guides = await db.select().from(careerGuideArticles).limit(2);

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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-2xl mx-auto px-[var(--spacing-container-padding)] pt-16 pb-10 text-center flex flex-col items-center">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Peluang Karir di Nanjing
        </h1>
        <p className="text-body-lg text-on-surface-variant mb-8">
          Lowongan magang dan kerja untuk mahasiswa Indonesia, dari startup lokal hingga peran akademik.
        </p>
        <form action="/jobs" className="w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari posisi, perusahaan..."
            className="w-full pl-12 pr-28 py-4 bg-surface-container-lowest border border-outline-variant rounded-md text-body-lg focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary text-label-caps uppercase px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
          >
            Cari
          </button>
        </form>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-outline-variant pb-4">
            <SlidersHorizontal size={18} className="text-on-background" />
            <h2 className="text-headline-md text-on-background">Filter</h2>
          </div>

          <div className="mb-8">
            <h3 className="text-label-caps uppercase text-on-surface-variant mb-3">Jenis Pekerjaan</h3>
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
                    className="flex items-center gap-2 text-body-md text-on-background hover:text-primary-container transition-colors"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedTypes.includes(t) ? "bg-primary-container border-primary-container" : "border-outline"
                      }`}
                    >
                      {selectedTypes.includes(t) && <span className="w-2 h-2 bg-on-primary rounded-sm" />}
                    </span>
                    {TYPE_LABEL[t]}
                  </a>
                );
              })}
            </div>
          </div>

          {locations.length > 0 && (
            <div>
              <h3 className="text-label-caps uppercase text-on-surface-variant mb-3">Lokasi</h3>
              <div className="flex flex-col gap-2">
                {locations.map((loc) => (
                  <a
                    key={loc}
                    href={buildQuery({ location: location === loc ? undefined : loc })}
                    className={`flex items-center gap-2 text-body-md transition-colors ${
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
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center text-center py-24">
              <Briefcase className="text-outline-variant mb-4" size={40} />
              <p className="text-body-md text-on-surface-variant">
                {q || selectedTypes.length || location ? "Tidak ada lowongan yang cocok dengan filter ini." : "Belum ada lowongan yang dibuka."}
              </p>
            </div>
          ) : (
            jobs.map((j) => (
              <a
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-label-caps uppercase tracking-wide bg-surface-container-low px-2 py-0.5 rounded">
                      {TYPE_LABEL[j.type] ?? j.type}
                    </span>
                    <span className="text-label-caps text-secondary">{formatRelativeTime(j.createdAt)}</span>
                  </div>
                  <h2 className="text-headline-md text-on-background mb-1">{j.title}</h2>
                  <p className="text-body-md text-on-surface-variant mb-2">{j.company}</p>
                  {j.location && (
                    <span className="flex items-center gap-1 text-label-caps text-secondary">
                      <MapPin size={12} /> {j.location}
                    </span>
                  )}
                </div>
                <span className="shrink-0 border border-primary-container text-primary-container text-label-caps uppercase tracking-wide px-5 py-2 rounded-md hover:bg-primary-container hover:text-on-primary transition-colors">
                  Lihat Detail
                </span>
              </a>
            ))
          )}
        </div>
      </main>

      {/* Career Resources - inline per the prototype rather than link-out only, mirrors comprehensive_career_center_ppit_nanjing */}
      <section className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24 border-t border-outline-variant pt-16">
        <h2 className="text-headline-lg text-on-background mb-8">Career Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guides.map((g) => (
            <a
              key={g.id}
              href={`/career/guide/${g.slug}`}
              className="flex items-start gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-6 hover:bg-surface-container-low transition-colors"
            >
              <BookOpen className="text-primary-container shrink-0" size={22} />
              <div>
                <h3 className="text-body-md font-semibold text-on-background mb-1">{g.title}</h3>
                {g.category && <p className="text-label-caps text-on-surface-variant">{g.category}</p>}
              </div>
            </a>
          ))}
          <a
            href="/career/mentorship"
            className="flex items-start gap-4 bg-primary-container/5 border border-primary-container/20 rounded-lg p-6 hover:bg-primary-container/10 transition-colors"
          >
            <Users className="text-primary-container shrink-0" size={22} />
            <div>
              <h3 className="text-body-md font-semibold text-on-background mb-1">Alumni Network Mentorship</h3>
              <p className="text-label-caps text-on-surface-variant">Terhubung dengan alumni untuk bimbingan karir</p>
            </div>
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
