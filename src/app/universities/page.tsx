import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import { GraduationCap, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { universities, districts as districtsTable } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Direktori Universitas - PPIT Nanjing",
  description: "Daftar universitas di Nanjing beserta distriknya, untuk mahasiswa Indonesia yang akan atau sedang kuliah di Nanjing.",
};

const UNASSIGNED = "Distrik lainnya";

export default async function UniversitiesPage() {
  const [rows, districtInfo] = await Promise.all([
    db
      .select()
      .from(universities)
      .where(eq(universities.published, true))
      .orderBy(asc(universities.orderIndex), asc(universities.name)),
    db.select().from(districtsTable).orderBy(asc(districtsTable.orderIndex), asc(districtsTable.name)),
  ]);

  // Group by district, keeping the admin-defined district order first and any
  // district that has no `districts` row after it.
  const byDistrict = new Map<string, typeof rows>();
  for (const u of rows) {
    const key = u.district?.trim() || UNASSIGNED;
    byDistrict.set(key, [...(byDistrict.get(key) ?? []), u]);
  }
  const ordered = [
    ...districtInfo.map((d) => d.name).filter((n) => byDistrict.has(n)),
    ...[...byDistrict.keys()].filter((k) => !districtInfo.some((d) => d.name === k)),
  ];
  const infoByName = new Map(districtInfo.map((d) => [d.name, d]));
  const partnerCount = rows.filter((u) => u.isPartner).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Jelajahi</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Direktori Universitas
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          {rows.length > 0
            ? `${rows.length} universitas di ${ordered.length} distrik Nanjing${partnerCount ? `, ${partnerCount} di antaranya kampus mitra` : ""}.`
            : "Daftar universitas di Nanjing beserta distriknya."}
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {rows.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <GraduationCap className="mx-auto mb-4 text-on-surface-variant" size={28} />
            <p className="text-body-lg text-on-background mb-1">Belum ada universitas yang ditampilkan</p>
            <p className="text-body-md text-on-surface-variant">
              Pengurus bisa menambahkannya lewat Console &rarr; Universitas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {ordered.map((district) => {
              const info = infoByName.get(district);
              const list = byDistrict.get(district) ?? [];
              return (
                <section key={district}>
                  <div className="border-b border-outline-variant pb-4 mb-5">
                    <h2 className="text-headline-md text-on-background">
                      {district}
                      {info?.nameZh && <span className="text-body-lg text-on-surface-variant"> {info.nameZh}</span>}
                    </h2>
                    <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mt-1">
                      {list.length} universitas
                    </p>
                    {info?.description && (
                      <p className="text-body-md text-on-surface-variant mt-3 max-w-3xl">{info.description}</p>
                    )}
                  </div>

                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {list.map((u) => (
                      <li
                        key={u.id}
                        className="flex gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5"
                      >
                        {u.logoUrl ? (
                          <Image
                            src={u.logoUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-md object-contain bg-surface-container shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center shrink-0">
                            <GraduationCap size={20} className="text-on-surface-variant" aria-hidden />
                          </div>
                        )}
                        <div className="min-w-0 flex flex-col gap-1">
                          <h3 className="text-body-lg text-on-background">
                            {u.name}
                            {u.abbreviation && (
                              <span className="text-on-surface-variant"> ({u.abbreviation})</span>
                            )}
                          </h3>
                          {u.nameZh && <p className="text-body-md text-on-surface-variant">{u.nameZh}</p>}
                          {u.description && <p className="text-body-md text-on-surface-variant">{u.description}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {u.isPartner && (
                              <span className="text-label-caps uppercase tracking-wide bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded">
                                Kampus mitra
                              </span>
                            )}
                            {u.studentCount != null && (
                              <span className="text-label-caps text-on-surface-variant">
                                ± {u.studentCount} mahasiswa Indonesia
                              </span>
                            )}
                            {u.websiteUrl && (
                              <a
                                href={u.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                              >
                                Situs <ExternalLink size={12} aria-hidden />
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
