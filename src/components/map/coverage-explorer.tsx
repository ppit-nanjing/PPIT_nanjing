"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CoverageFeature } from "@/app/coverage/page";
import { CoverageMap } from "@/components/coverage-map";
import { useT } from "@/lib/i18n/client";

export type CoverageCity = {
  /** Slug kota, sama dengan id di berkas batas wilayah. */
  id: string;
  memberCount: number | null;
  contactInfo: string | null;
  note: string | null;
};

/**
 * Peta wilayah naungan dan daftar kotanya. Keduanya satu komponen klien karena
 * menyorot baris di daftar harus menyorot kotanya di peta.
 */
export function CoverageExplorer({
  features,
  cities,
  districtCount,
}: {
  features: CoverageFeature[];
  cities: CoverageCity[];
  /** Jumlah distrik Nanjing, untuk teks tautan ke /map. */
  districtCount: number;
}) {
  const t = useT();
  const [hovered, setHovered] = useState<string | null>(null);
  const info = new Map(cities.map((c) => [c.id, c]));
  // Selama belum ada satu kota pun yang diisi, sembilan tanda pisah hanya jadi derau.
  const anyCounted = cities.some((c) => c.memberCount != null);

  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      <div className="mx-auto w-full max-w-[36rem] lg:max-w-none">
        <CoverageMap
          ariaLabel={t("coverage.mapAria", { n: features.length })}
          features={features}
          counts={Object.fromEntries(features.map((f) => [f.properties.id, info.get(f.properties.id)?.memberCount ?? null]))}
          // Hanya Nanjing yang punya peta distrik, jadi hanya Nanjing yang bisa dimasuki.
          links={{ nanjing: "/map" }}
          highlight="nanjing"
          highlightLabel={t("coverage.seatLegend")}
          labels={false}
          spotlight={hovered}
        />
      </div>

      {/* Baris yang sama dengan daftar distrik di /map, supaya kedua peta terbaca sebagai satu keluarga. */}
      <ul className="divide-y divide-outline-variant border-y border-outline-variant">
        {features.map((f) => {
          const id = f.properties.id;
          const city = info.get(id);
          return (
            <li
              key={id}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4 px-2 py-4 transition-colors hover:bg-surface-container-low motion-reduce:transition-none"
            >
              <span lang="zh" aria-hidden className="whitespace-nowrap font-serif text-[26px] leading-none text-heading">
                {f.properties.zh.replace(/市$/, "")}
              </span>
              <div className="min-w-0">
                <h2 className="text-headline-sm text-on-background">{f.properties.label}</h2>
                {f.properties.within && (
                  <p className="text-body-sm text-on-surface-variant">
                    {t("coverage.partOf", {
                      parent: features.find((x) => x.properties.id === f.properties.within)?.properties.label ?? "",
                    })}
                  </p>
                )}
                {city?.contactInfo && <p className="mt-1 text-body-md text-on-surface-variant">{city.contactInfo}</p>}
                {city?.note && <p className="mt-1 text-body-sm text-on-surface-variant">{city.note}</p>}
                {id === "nanjing" && (
                  <Link
                    href="/map"
                    onFocus={() => setHovered(id)}
                    onBlur={() => setHovered(null)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded text-label-caps uppercase text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {t("coverage.openDistricts", { n: districtCount })} <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </div>
              {anyCounted && (
                <span className="shrink-0 text-label-caps uppercase text-on-surface-variant">
                  {city?.memberCount != null ? t("coverage.people", { n: city.memberCount }) : "—"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
