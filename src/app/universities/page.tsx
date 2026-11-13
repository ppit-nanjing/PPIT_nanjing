import { asc, eq } from "drizzle-orm";
import { GraduationCap } from "lucide-react";
import { db } from "@/db";
import { universities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import {
  UniversityDirectory,
  type DirectoryCampus,
  type DirectoryCity,
  type DirectoryGroup,
} from "@/components/universities/university-directory";
import type { CoverageFeature } from "@/app/coverage/page";
import geo from "@/data/nanjing-coverage.geo.json";
import districtGeo from "@/data/nanjing-districts.geo.json";
import { getT } from "@/lib/i18n/server";
import { COVERAGE_CITY_SLUGS, coverageCityRank } from "@/lib/coverage-cities";
import { outlineOf, outlinesOf } from "@/lib/geo-outline";
import { NANJING_DISTRICTS, canonicalDistrict } from "@/lib/nanjing-districts";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("uni.metaTitle"), description: t("uni.metaDesc") };
}

// Kota tempat sekretariat, dan satu-satunya kota yang kampusnya dibagi per distrik.
const SEAT = "nanjing";
// Kampus yang kotanya bukan salah satu dari 9 kota naungan.
const OTHER = "lainnya";

export default async function UniversitiesPage() {
  const { t } = await getT();
  const rows = await db
    .select()
    .from(universities)
    .where(eq(universities.published, true))
    .orderBy(asc(universities.orderIndex), asc(universities.name));

  const features = new Map(
    (geo as unknown as { features: CoverageFeature[] }).features.map((f) => [f.properties.id, f]),
  );
  const districtFeatures = (districtGeo as unknown as { features: CoverageFeature[] }).features;

  // Kampus dikelompokkan per KOTA (mereka tersebar di 9 kota naungan), lalu per
  // distrik di kota yang kampusnya punya distrik. Nama kota dicocokkan lewat
  // coverageCityRank, yang menerima "Huai’an", "Huai'an", maupun "huaian".
  const byCity = new Map<string, typeof rows>();
  for (const u of rows) {
    const slug = COVERAGE_CITY_SLUGS[coverageCityRank(u.city ?? "")] ?? OTHER;
    byCity.set(slug, [...(byCity.get(slug) ?? []), u]);
  }

  const toCampus = (u: (typeof rows)[number]): DirectoryCampus => ({
    id: u.id,
    name: u.name,
    nameZh: u.nameZh,
    abbreviation: u.abbreviation,
    logoUrl: u.logoUrl,
    websiteUrl: u.websiteUrl,
    studentCount: u.studentCount,
    isPartner: u.isPartner,
    coordinatorName: u.coordinatorName,
    coordinatorEmail: u.coordinatorEmail,
  });

  const groupsOf = (list: typeof rows): DirectoryGroup[] => {
    const byDistrict = new Map<string, typeof rows>();
    for (const u of list) {
      const key = canonicalDistrict(u.district) ?? "";
      byDistrict.set(key, [...(byDistrict.get(key) ?? []), u]);
    }
    // Tidak ada satu pun yang berdistrik: kota ini tidak dibagi, jadi satu kelompok tanpa judul.
    if (byDistrict.size === 1 && byDistrict.has("")) {
      return [{ key: "all", label: null, zh: null, href: null, locate: null, campuses: list.map(toCampus) }];
    }
    return [...byDistrict.entries()]
      // Distrik terpadat dulu; yang belum berdistrik selalu paling akhir.
      .sort(([a, x], [b, y]) => (a === "" ? 1 : b === "" ? -1 : y.length - x.length || a.localeCompare(b)))
      .map(([key, campuses]) => ({
        key: key || "none",
        label: key || t("uni.noDistrict"),
        zh: NANJING_DISTRICTS.find((d) => d.label === key)?.zh.replace(/区$/, "") ?? null,
        href: key ? `/map?distrik=${key.toLowerCase()}` : null,
        locate: districtFeatures.find((f) => f.properties.label === key)?.properties.id ?? null,
        campuses: campuses.map(toCampus),
      }));
  };

  const cities: DirectoryCity[] = [...COVERAGE_CITY_SLUGS, OTHER].flatMap((slug) => {
    const list = byCity.get(slug);
    if (!list) return [];
    const feature = features.get(slug);
    return [
      {
        id: slug,
        label: feature?.properties.label ?? t("uni.unassigned"),
        zh: feature?.properties.zh.replace(/市$/, "") ?? null,
        outline: feature ? outlineOf(feature) : null,
        seat: slug === SEAT,
        href: slug === SEAT ? "/map" : null,
        // 60 titik per bentuk cukup untuk gambar selebar 64px.
        locator: slug === SEAT ? outlinesOf(districtFeatures, 110, 60) : null,
        groups: groupsOf(list),
      },
    ];
  });

  const partnerCount = rows.filter((u) => u.isPartner).length;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader
        eyebrow={t("explore.kicker")}
        title={t("uni.title")}
        intro={
          rows.length > 0
            ? t("uni.lead", {
                n: rows.length,
                cities: cities.length,
                partners: partnerCount ? t("uni.leadPartners", { n: partnerCount }) : "",
              })
            : t("uni.leadEmpty")
        }
      />

      <div className="h-12" aria-hidden="true" />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {rows.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <GraduationCap className="mx-auto mb-4 text-on-surface-variant" size={28} />
            <p className="text-body-lg text-on-background mb-1">{t("uni.empty")}</p>
            <p className="text-body-md text-on-surface-variant">{t("uni.emptyDesc")}</p>
          </div>
        ) : (
          <UniversityDirectory cities={cities} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
