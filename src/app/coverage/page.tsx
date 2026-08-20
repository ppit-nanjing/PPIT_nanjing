import { asc } from "drizzle-orm";
import { db } from "@/db";
import { coverageCities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CoverageMap } from "@/components/coverage-map";
import geo from "@/data/nanjing-coverage.geo.json";

export const metadata = {
  title: "Wilayah Naungan - PPIT Nanjing",
  description:
    "Sembilan kota di bawah naungan PPIT Nanjing: Nanjing, Huai'an, Jurong, Lianyungang, Ma'anshan, Taizhou, Xuzhou, Yancheng, dan Zhenjiang.",
};

export type CoverageFeature = {
  type: "Feature";
  properties: { id: string; label: string; zh: string; adcode: number; center: [number, number]; within: string | null };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
};

export default async function CoveragePage() {
  const rows = await db.select().from(coverageCities).orderBy(asc(coverageCities.label));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const features = (geo as unknown as { features: CoverageFeature[] }).features;
  const counted = rows.filter((r) => r.memberCount != null);
  const total = counted.reduce((sum, r) => sum + (r.memberCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Jelajahi</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">Wilayah Naungan</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          PPIT Nanjing menaungi <strong className="text-on-background">{features.length} kota</strong> di Jiangsu dan
          Anhui.{" "}
          {counted.length > 0
            ? `Tercatat ${total} mahasiswa Indonesia di ${counted.length} kota.`
            : "Jumlah mahasiswa per kota belum diisi pengurus."}
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        <CoverageMap
          ariaLabel={`Peta ${features.length} kota naungan PPIT Nanjing`}
          features={features}
          counts={Object.fromEntries(
            features.map((f) => [f.properties.id, bySlug.get(f.properties.id)?.memberCount ?? null]),
          )}
        />

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {features.map((f) => {
            const row = bySlug.get(f.properties.id);
            return (
              <li
                key={f.properties.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-headline-sm text-on-background">
                    {f.properties.label} <span className="text-body-md text-on-surface-variant">{f.properties.zh}</span>
                  </h2>
                  <span className="text-label-caps uppercase tracking-wide text-on-surface-variant shrink-0">
                    {row?.memberCount != null ? `${row.memberCount} orang` : "—"}
                  </span>
                </div>
                {f.properties.within && (
                  <p className="text-label-caps text-on-surface-variant mt-1">
                    Bagian dari {features.find((x) => x.properties.id === f.properties.within)?.properties.label}
                  </p>
                )}
                {row?.contactInfo && <p className="text-body-md text-on-surface-variant mt-2">{row.contactInfo}</p>}
                {row?.note && <p className="text-body-sm text-on-surface-variant mt-1">{row.note}</p>}
              </li>
            );
          })}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
