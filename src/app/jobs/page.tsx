import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobPostings } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Briefcase, MapPin } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  internship: "Magang",
  full_time: "Full-time",
  part_time: "Part-time",
  volunteer: "Volunteer",
};

export default async function JobsPage() {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.status, "open"));

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
          Jobs &amp; Opportunities
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Lowongan magang dan kerja untuk mahasiswa Indonesia di Nanjing.
        </p>
        <div className="flex gap-4 mt-6">
          <a href="/career" className="text-label-caps text-primary-container hover:text-primary underline">
            Pusat Karir
          </a>
          <a href="/career/mentorship" className="text-label-caps text-primary-container hover:text-primary underline">
            Program Mentorship
          </a>
        </div>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Briefcase className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">Belum ada lowongan yang dibuka.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((j) => (
              <a
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center justify-between gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0_10px_30px_rgba(39,23,22,0.06)] transition-shadow"
              >
                <div>
                  <h2 className="text-headline-md text-on-background mb-1">{j.title}</h2>
                  <p className="text-body-md text-on-surface-variant mb-2">{j.company}</p>
                  <div className="flex gap-3 text-label-caps text-on-surface-variant">
                    <span className="uppercase tracking-wide bg-surface-container-low px-2 py-1 rounded">
                      {TYPE_LABEL[j.type] ?? j.type}
                    </span>
                    {j.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {j.location}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
