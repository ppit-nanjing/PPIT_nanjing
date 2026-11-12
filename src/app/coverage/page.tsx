import { asc } from "drizzle-orm";
import { db } from "@/db";
import { coverageCities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PageHeader } from "@/components/page-header";
import { CoverageExplorer } from "@/components/map/coverage-explorer";
import geo from "@/data/nanjing-coverage.geo.json";
import districtGeo from "@/data/nanjing-districts.geo.json";
import { sortByCoverageOrder } from "@/lib/coverage-cities";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("coverage.metaTitle"), description: t("coverage.metaDesc") };
}

export type CoverageFeature = {
  type: "Feature";
  properties: { id: string; label: string; zh: string; adcode: number; center: [number, number]; within: string | null };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

export default async function CoveragePage() {
  const { t } = await getT();
  const rows = await db.select().from(coverageCities).orderBy(asc(coverageCities.label));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const features = sortByCoverageOrder(
    (geo as unknown as { features: CoverageFeature[] }).features,
    (feature) => feature.properties.id,
  );
  const counted = rows.filter((r) => r.memberCount != null);
  const total = counted.reduce((sum, r) => sum + (r.memberCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <PageHeader
        eyebrow={t("explore.kicker")}
        title={t("coverage.title")}
        intro={
          <>
            {t("coverage.leadPrefix")}{" "}
            <strong className="text-on-background">{t("coverage.leadCities", { n: features.length })}</strong>{" "}
            {t("coverage.leadSuffix")}{" "}
            {counted.length > 0
              ? t("coverage.counted", { total, cities: counted.length })
              : t("coverage.notCounted")}
          </>
        }
      />

      <div className="h-12" aria-hidden="true" />

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        <CoverageExplorer
          features={features}
          cities={features.map((f) => {
            const row = bySlug.get(f.properties.id);
            return {
              id: f.properties.id,
              memberCount: row?.memberCount ?? null,
              contactInfo: row?.contactInfo ?? null,
              note: row?.note ?? null,
            };
          })}
          districtCount={districtGeo.features.length}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
