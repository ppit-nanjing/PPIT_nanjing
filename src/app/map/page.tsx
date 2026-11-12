import { Suspense } from "react";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { districts, places, universities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { DistrictExplorer } from "@/components/map/district-explorer";
import type { CoverageFeature } from "@/app/coverage/page";
import geo from "@/data/nanjing-districts.geo.json";
import { canonicalDistrict } from "@/lib/nanjing-districts";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Sama dengan CATEGORY di /places; hanya labelnya yang dipakai di sini.
const CATEGORY_LABEL: Record<string, TKey> = {
  tourism: "places.catTourism",
  culture: "places.catCulture",
  nature: "places.catNature",
  food: "places.catFood",
  shopping: "places.catShopping",
  spiritual: "places.catSpiritual",
  practical: "places.catPractical",
};

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("njmap.metaTitle"), description: t("njmap.metaDesc") };
}

export default async function NanjingMapPage() {
  const { t, locale } = await getT();
  const pick = (id: string | null, en: string | null) => (locale === "en" ? (en ?? id) : id);
  const features = (geo as unknown as { features: CoverageFeature[] }).features;

  const [placeRows, uniRows, districtRows] = await Promise.all([
    db
      .select()
      .from(places)
      .where(and(eq(places.published, true), isNotNull(places.district)))
      .orderBy(asc(places.name)),
    db
      .select()
      .from(universities)
      .where(and(eq(universities.published, true), isNotNull(universities.district)))
      .orderBy(asc(universities.orderIndex), asc(universities.name)),
    db.select().from(districts),
  ]);

  // Distrik dicocokkan lewat nama Inggris maupun Mandarin (canonicalDistrict), karena
  // baris lama diketik bebas. Yang tidak cocok dengan 11 distrik tidak ikut tampil.
  const placeCards = placeRows.flatMap((p) => {
    const district = canonicalDistrict(p.district);
    if (!district) return [];
    return [
      {
        id: p.id,
        category: p.category,
        categoryLabel: CATEGORY_LABEL[p.category] ? t(CATEGORY_LABEL[p.category]) : p.category,
        district,
        name: pick(p.name, p.nameEn) ?? p.name,
        nameZh: p.nameZh,
        description: pick(p.description, p.descriptionEn),
        metroStation: p.address,
        addressZh: p.addressZh,
        imageUrl: p.imageUrl,
        mapUrl: p.mapUrl,
      },
    ];
  });

  const campuses = uniRows.flatMap((u) => {
    const district = canonicalDistrict(u.district);
    if (!district) return [];
    return [
      { id: u.id, district, name: u.name, nameZh: u.nameZh, abbreviation: u.abbreviation, websiteUrl: u.websiteUrl },
    ];
  });

  const descriptions: Record<string, string> = {};
  for (const d of districtRows) {
    const key = canonicalDistrict(d.name);
    const text = pick(d.description, d.descriptionEn);
    if (key && text) descriptions[key] = text;
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader eyebrow={t("explore.kicker")} title={t("njmap.title")} intro={t("njmap.lead", { n: features.length })} />

      <div className="h-12" aria-hidden="true" />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {/* useSearchParams di dalamnya butuh batas Suspense bila rute ini suatu saat diprerender. */}
        <Suspense>
          <DistrictExplorer features={features} descriptions={descriptions} campuses={campuses} places={placeCards} />
        </Suspense>

        {/* Tiga peta di situs ini memang berbeda cakupan - tautkan supaya tidak tertukar. */}
        <div className="mt-20 border-t border-outline-variant pt-6">
          <p className="text-label-caps uppercase text-on-surface-variant mb-2">{t("njmap.otherMaps")}</p>
          <ul className="flex flex-col sm:flex-row gap-x-10 gap-y-2 text-body-md">
            <li>
              <Link href="/coverage" className="text-primary-container hover:underline">
                {t("coverage.title")}
              </Link>
              <span className="text-on-surface-variant"> — {t("njmap.coverageNote")}</span>
            </li>
            <li>
              <Link href="/organization/map" className="text-primary-container hover:underline">
                {t("org.branches.title")}
              </Link>
              <span className="text-on-surface-variant"> — {t("njmap.branchesNote")}</span>
            </li>
          </ul>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
