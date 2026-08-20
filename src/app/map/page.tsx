import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { places, universities } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { CoverageMap } from "@/components/coverage-map";
import type { CoverageFeature } from "@/app/coverage/page";
import geo from "@/data/nanjing-districts.geo.json";

export const metadata = {
  title: "Peta Distrik Nanjing - PPIT Nanjing",
  description: "Sebelas distrik Kota Nanjing beserta tempat dan kampus yang tercatat di masing-masing distrik.",
};

export default async function NanjingMapPage() {
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
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Jelajahi</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">Peta Distrik Nanjing</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Kota Nanjing terbagi ke dalam {features.length} distrik.{" "}
          {totalTagged > 0
            ? `${totalTagged} tempat dan kampus sudah ditandai distriknya.`
            : "Tempat dan kampus belum ditandai distriknya, jadi hitungannya masih kosong."}
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        <CoverageMap
          features={features}
          counts={counts}
          ariaLabel={`Peta ${features.length} distrik Kota Nanjing`}
          hint="Arahkan kursor atau ketuk sebuah distrik untuk melihat namanya. Batas wilayah dari data administrasi resmi Tiongkok."
          unit="tempat & kampus tercatat"
          emptyUnit="belum ada yang ditandai di distrik ini"
        />

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
          {features.map((f) => (
            <li
              key={f.properties.id}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3"
            >
              <p className="text-body-md text-on-background">{f.properties.label}</p>
              <p className="text-label-caps text-on-surface-variant">
                {f.properties.zh}
                {counts[f.properties.id] != null ? ` · ${counts[f.properties.id]}` : ""}
              </p>
            </li>
          ))}
        </ul>

        {/* Tiga peta di situs ini memang berbeda cakupan - tautkan supaya tidak tertukar. */}
        <div className="mt-10 bg-surface-container-low border border-outline-variant rounded-xl p-5">
          <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">Peta lain</p>
          <ul className="flex flex-col sm:flex-row gap-4 text-body-md">
            <li>
              <Link href="/coverage" className="text-primary-container hover:underline">
                Wilayah Naungan
              </Link>
              <span className="text-on-surface-variant"> — 9 kota di bawah PPIT Nanjing</span>
            </li>
            <li>
              <Link href="/organization/map" className="text-primary-container hover:underline">
                Cabang PPI Tiongkok
              </Link>
              <span className="text-on-surface-variant"> — 32 cabang se-Tiongkok</span>
            </li>
          </ul>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
