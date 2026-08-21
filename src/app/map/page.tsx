import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { places, universities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CoverageMap } from "@/components/coverage-map";
import type { CoverageFeature } from "@/app/coverage/page";
import geo from "@/data/nanjing-districts.geo.json";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("njmap.metaTitle"), description: t("njmap.metaDesc") };
}

export default async function NanjingMapPage() {
  const { t } = await getT();
  const features = (geo as unknown as { features: CoverageFeature[] }).features;

  // Distrik dicocokkan lewat nama Inggris maupun Mandarin, karena admin bisa
  // mengetik salah satunya saat menambah tempat/kampus.
  const [placeRows, uniRows] = await Promise.all([
    db
      .select({ district: places.district, n: sql<number>`count(*)::int` })
      .from(places)
      .where(eq(places.published, true))
      .groupBy(places.district),
    db
      .select({ district: universities.district, n: sql<number>`count(*)::int` })
      .from(universities)
      .where(eq(universities.published, true))
      .groupBy(universities.district),
  ]);

  const tally = (rows: { district: string | null; n: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.district) continue;
      const key = r.district.trim().toLowerCase();
      m.set(key, (m.get(key) ?? 0) + r.n);
    }
    return m;
  };
  const placeBy = tally(placeRows);
  const uniBy = tally(uniRows);

  const countFor = (f: CoverageFeature) => {
    const en = f.properties.label.toLowerCase();
    const zh = f.properties.zh.toLowerCase();
    const zhShort = f.properties.zh.replace(/区$/, "").toLowerCase();
    const get = (m: Map<string, number>) => (m.get(en) ?? 0) + (m.get(zh) ?? 0) + (m.get(zhShort) ?? 0);
    return get(placeBy) + get(uniBy);
  };

  const counts = Object.fromEntries(
    features.map((f) => {
      const n = countFor(f);
      return [f.properties.id, n > 0 ? n : null];
    }),
  );
  const totalTagged = Object.values(counts).reduce<number>((s, n) => s + (n ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("explore.kicker")}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">{t("njmap.title")}</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          {t("njmap.lead", { n: features.length })}{" "}
          {totalTagged > 0 ? t("njmap.tagged", { n: totalTagged }) : t("njmap.untagged")}
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {/* Nanjing is tall and narrow, so the map is a slim column. Pairing it
            with the district list fills the row instead of leaving dead space. */}
        <div className="grid grid-cols-1 lg:grid-cols-[26rem_minmax(0,1fr)] gap-6 items-start">
          <CoverageMap
            features={features}
            counts={counts}
            ariaLabel={t("njmap.mapAria", { n: features.length })}
            hint={t("njmap.hint")}
            searchLabel={t("njmap.searchLabel")}
            unit={t("njmap.unit")}
            emptyUnit={t("njmap.emptyUnit")}
          />

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((f) => (
              <li
                key={f.properties.id}
                className="flex items-baseline justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-body-md text-on-background">{f.properties.label}</span>
                  <span className="block text-label-caps text-on-surface-variant">{f.properties.zh}</span>
                </span>
                <span className="text-label-caps uppercase tracking-wide text-on-surface-variant shrink-0">
                  {counts[f.properties.id] ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tiga peta di situs ini memang berbeda cakupan - tautkan supaya tidak tertukar. */}
        <div className="mt-10 bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("njmap.otherMaps")}</p>
          <ul className="flex flex-col sm:flex-row gap-4 text-body-md">
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
