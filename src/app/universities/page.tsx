import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import { GraduationCap, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { universities, coverageCities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("uni.metaTitle"), description: t("uni.metaDesc") };
}

export default async function UniversitiesPage() {
  const { t, locale } = await getT();
  // description is admin-typed free text (ID); descriptionEn is an auto-
  // translation that can be null (AI not run yet / failed) - fallback to ID.
  const pickDesc = (u: { description: string | null; descriptionEn: string | null }) =>
    locale === "en" ? (u.descriptionEn ?? u.description) : u.description;
  // Bucket label for rows with no city set - translated, so it has to be
  // resolved inside the component rather than as a module constant.
  const UNASSIGNED = t("uni.unassigned");
  const [rows, cityInfo] = await Promise.all([
    db
      .select()
      .from(universities)
      .where(eq(universities.published, true))
      .orderBy(asc(universities.orderIndex), asc(universities.name)),
    // Kampus dikelompokkan per KOTA — mereka tersebar di 9 kota naungan, bukan
    // cuma di distrik-distrik Nanjing.
    db.select().from(coverageCities).orderBy(asc(coverageCities.label)),
  ]);

  const byCity = new Map<string, typeof rows>();
  for (const u of rows) {
    const key = u.city?.trim() || UNASSIGNED;
    byCity.set(key, [...(byCity.get(key) ?? []), u]);
  }
  // Kota terbanyak dulu; Nanjing hampir pasti di atas.
  const ordered = [...byCity.keys()].sort((a, b) => (byCity.get(b)?.length ?? 0) - (byCity.get(a)?.length ?? 0));
  const infoByName = new Map(cityInfo.map((c) => [c.label, c]));
  const partnerCount = rows.filter((u) => u.isPartner).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("explore.kicker")}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          {t("uni.title")}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          {rows.length > 0
            ? t("uni.lead", {
                n: rows.length,
                cities: ordered.length,
                partners: partnerCount ? t("uni.leadPartners", { n: partnerCount }) : "",
              })
            : t("uni.leadEmpty")}
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {rows.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <GraduationCap className="mx-auto mb-4 text-on-surface-variant" size={28} />
            <p className="text-body-lg text-on-background mb-1">{t("uni.empty")}</p>
            <p className="text-body-md text-on-surface-variant">
              {t("uni.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {ordered.map((city) => {
              const info = infoByName.get(city);
              const list = byCity.get(city) ?? [];
              return (
                <section key={city}>
                  <div className="border-b border-outline-variant pb-4 mb-5">
                    <h2 className="text-headline-md text-on-background">
                      {city}
                    </h2>
                    <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mt-1">
                      {t("uni.count", { n: list.length })}
                      {info?.memberCount != null
                        ? ` · ${t("uni.studentsApprox", { n: info.memberCount })}`
                        : ""}
                    </p>
                    {info?.note && (
                      <p className="text-body-md text-on-surface-variant mt-3 max-w-3xl">{info.note}</p>
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
                          {pickDesc(u) && <p className="text-body-md text-on-surface-variant">{pickDesc(u)}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            {u.isPartner && (
                              <span className="text-label-caps uppercase tracking-wide bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded">
                                {t("uni.partner")}
                              </span>
                            )}
                            {u.studentCount != null && (
                              <span className="text-label-caps text-on-surface-variant">
                                {t("uni.studentsApprox", { n: u.studentCount })}
                              </span>
                            )}
                            {u.coordinatorName && (
                              <span className="text-label-caps text-on-surface-variant">
                                {t("uni.coordinator")} <span className="text-on-background">{u.coordinatorName}</span>
                              </span>
                            )}
                            {u.coordinatorEmail && (
                              <a
                                href={`mailto:${u.coordinatorEmail}`}
                                className="text-label-caps text-primary-container hover:underline"
                              >
                                {u.coordinatorEmail}
                              </a>
                            )}
                            {u.websiteUrl && (
                              <a
                                href={u.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                              >
                                {t("uni.website")} <ExternalLink size={12} aria-hidden />
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
