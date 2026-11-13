"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Search, X } from "lucide-react";
import type { Outline, Outlines } from "@/lib/geo-outline";
import { plain } from "@/lib/search-text";
import { useT } from "@/lib/i18n/client";

export type DirectoryCampus = {
  id: string;
  name: string;
  nameZh: string | null;
  abbreviation: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  studentCount: number | null;
  isPartner: boolean;
  coordinatorName: string | null;
  coordinatorEmail: string | null;
};

/** Satu kelompok kampus di dalam kota: satu distrik Nanjing, atau seluruh kota bila kotanya tidak dibagi. */
export type DirectoryGroup = {
  key: string;
  /** null = kota yang tidak dibagi per distrik, jadi tanpa judul kelompok. */
  label: string | null;
  zh: string | null;
  /** Tautan ke distrik ini di /map. */
  href: string | null;
  /** Id wilayah yang disorot di peta penunjuk kota (lihat DirectoryCity.locator). */
  locate: string | null;
  campuses: DirectoryCampus[];
};

export type DirectoryCity = {
  /** Dipakai sebagai jangkar (#nanjing). */
  id: string;
  label: string;
  zh: string | null;
  outline: Outline | null;
  /** Kota tempat sekretariat: siluetnya emas, seperti di peta Wilayah Naungan. */
  seat: boolean;
  /** Tautan ke peta kota ini, bila ada. */
  href: string | null;
  /** Bentuk semua distrik kota ini pada satu kanvas, untuk peta penunjuk tiap kelompok. */
  locator: Outlines | null;
  groups: DirectoryGroup[];
};

// Garis emas siluet berjarak sekian piksel dari bentuknya, sama dengan CoverageMap.
const CONTOUR_GAP = 4;

const quietLink =
  "inline-flex items-center gap-1.5 rounded text-label-caps uppercase text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Siluet kota sebagai penanda bagian. Dekorasi: nama kotanya sudah tertulis di sebelahnya. */
function CityOutline({ outline, seat }: { outline: Outline; seat: boolean }) {
  const id = useId();
  const pad = CONTOUR_GAP + 2;
  return (
    <svg
      aria-hidden
      viewBox={`${-pad} ${-pad} ${outline.w + pad * 2} ${outline.h + pad * 2}`}
      className="h-full w-full overflow-visible"
    >
      <defs>
        <path id={id} d={outline.d} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </defs>
      <use href={`#${id}`} strokeWidth={CONTOUR_GAP * 2 + 2} className="fill-muted-gold stroke-muted-gold opacity-60" />
      <use href={`#${id}`} strokeWidth={CONTOUR_GAP * 2} className="fill-background stroke-background" />
      <use href={`#${id}`} className={seat ? "fill-accent" : "fill-surface-container-high"} />
    </svg>
  );
}

/**
 * Logo kampus, atau monogram singkatannya selama logonya belum diisi. Logo
 * berlatar gading (`on-band`, terang di keenam palet) di kedua mode warna, karena
 * sebagian besar logo kampus berwarna gelap dan hilang di atas latar mode gelap.
 */
function CampusMark({ logoUrl, abbreviation, name }: { logoUrl: string | null; abbreviation: string | null; name: string }) {
  if (logoUrl) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-band p-1 ring-1 ring-outline-variant">
        {/* multiply: latar putih logo JPG menyatu dengan lingkaran gading, alih-alih membentuk kotak. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- logo 36px dari folder public; optimizer gambar dimatikan di next.config. */}
        <img src={logoUrl} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 object-contain mix-blend-multiply" />
      </span>
    );
  }
  // Tanpa singkatan: huruf awal tiap kata yang bukan kata sambung ("Jinling Institute" -> "JI").
  const mono =
    abbreviation ||
    name
      .split(/\s+/)
      .filter((w) => !/^(of|and|the|for)$/i.test(w))
      .map((w) => w[0])
      .join("")
      .slice(0, 4);
  return (
    <span
      aria-hidden
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-muted-gold/70 font-serif font-semibold leading-none text-gold-ink ${
        mono.length > 3 ? "text-[9px] tracking-[0.02em]" : "text-[11px] tracking-[0.06em]"
      }`}
    >
      {mono}
    </span>
  );
}

/**
 * Peta penunjuk: seluruh kota dalam ukuran kecil dengan satu distrik berwarna
 * emas, supaya tiap kelompok menunjukkan letaknya (Jiangning di selatan, Pukou di
 * barat). Bentuknya didefinisikan sekali per kota (`prefix`) dan dipakai ulang.
 */
function Locator({ map, prefix, active }: { map: Outlines; prefix: string; active: string | null }) {
  return (
    <svg aria-hidden viewBox={`-2 -2 ${map.w + 4} ${map.h + 4}`} className="h-auto w-full overflow-visible">
      {Object.keys(map.paths).map((id) => (
        <use key={id} href={`#${prefix}${id}`} strokeWidth={0.75} className="fill-surface-container-high stroke-background" />
      ))}
      {/* Digambar lagi paling akhir dengan garis tepi: distrik pusat kota hanya beberapa piksel. */}
      {active && <use href={`#${prefix}${active}`} strokeWidth={1.25} className="fill-accent stroke-gold-ink" />}
    </svg>
  );
}

/**
 * Direktori kampus: kota, lalu distrik untuk Nanjing, lalu kampus. Semua baris
 * (puluhan) dikirim sekali dari server, jadi pencarian hanya menyaring di klien.
 */
export function UniversityDirectory({ cities }: { cities: DirectoryCity[] }) {
  const t = useT();
  const uid = useId();
  const [query, setQuery] = useState("");
  const needle = plain(query);

  const total = cities.reduce((n, c) => n + c.groups.reduce((m, g) => m + g.campuses.length, 0), 0);

  // Nama distrik ikut dicari, supaya "gulou" menampilkan semua kampus di Gulou.
  const shown = !needle
    ? cities
    : cities
        .map((city) => ({
          ...city,
          groups: city.groups
            .map((group) => ({
              ...group,
              campuses: group.campuses.filter((c) =>
                [c.name, c.abbreviation, group.label].some((s) => s && plain(s).includes(needle)) ||
                [c.nameZh, group.zh].some((s) => s && s.includes(query.trim())),
              ),
            }))
            .filter((group) => group.campuses.length > 0),
        }))
        .filter((city) => city.groups.length > 0);

  const countOf = (city: DirectoryCity) => city.groups.reduce((n, g) => n + g.campuses.length, 0);
  const found = shown.reduce((n, c) => n + countOf(c), 0);
  const shownIds = new Set(shown.map((c) => c.id));
  const largest = Math.max(1, ...cities.map(countOf));

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
      <div className="lg:sticky lg:top-28">
        <div role="search">
          <div className="flex items-center gap-2 rounded-md bg-soft-gray px-3 focus-within:ring-2 focus-within:ring-primary-container">
            <Search size={16} aria-hidden className="shrink-0 text-on-surface-variant" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("uni.searchLabel")}
              aria-label={t("uni.searchLabel")}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-body-md text-on-background placeholder:text-on-surface-variant focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("njmap.clearSearch")}
                className="-mr-2 flex h-9 w-9 items-center justify-center rounded text-on-surface-variant hover:text-on-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
          <p aria-live="polite" className="mt-2 min-h-[1.55em] text-body-sm text-on-surface-variant">
            {needle && t("uni.matchCount", { n: found, total })}
          </p>
        </div>

        {/* Daftar isi per kota. Di layar sempit menjadi satu baris yang digulir ke samping. */}
        <nav aria-label={t("uni.indexAria")} className="mt-2">
          <ul className="-mx-[var(--spacing-container-padding)] flex gap-2 overflow-x-auto px-[var(--spacing-container-padding)] pb-2 lg:mx-0 lg:block lg:divide-y lg:divide-outline-variant lg:overflow-visible lg:border-y lg:border-outline-variant lg:px-0 lg:pb-0">
            {cities.map((city) => {
              const hit = shown.find((c) => c.id === city.id);
              return (
                <li key={city.id} className="shrink-0">
                  <a
                    href={`#${city.id}`}
                    aria-disabled={!shownIds.has(city.id) || undefined}
                    className={`relative flex items-center gap-3 rounded-md bg-surface-container-low px-3.5 py-2.5 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container motion-reduce:transition-none lg:rounded-none lg:bg-transparent lg:px-2 lg:py-3 lg:hover:bg-surface-container-low ${
                      shownIds.has(city.id) ? "" : "pointer-events-none opacity-40"
                    }`}
                  >
                    {city.zh && (
                      <span lang="zh" aria-hidden className="whitespace-nowrap font-serif text-[18px] leading-none text-heading lg:w-[3.75rem] lg:text-[20px]">
                        {city.zh}
                      </span>
                    )}
                    <span className="flex-1 whitespace-nowrap text-body-md text-on-background">{city.label}</span>
                    <span className="text-label-caps text-on-surface-variant">{hit ? countOf(hit) : 0}</span>
                    {/* Porsi kota ini dari seluruh kampus; di layar sempit angkanya sudah cukup. */}
                    <span
                      aria-hidden
                      style={{ width: `${(countOf(city) / largest) * 100}%` }}
                      className="absolute bottom-0 left-0 hidden h-0.5 bg-heading/55 lg:block"
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="min-w-0">
        {shown.length === 0 && (
          <div className="border-y border-outline-variant py-10">
            <p className="text-body-lg text-on-background">{t("uni.noMatch")}</p>
            <p className="mt-1 max-w-[55ch] text-body-md text-on-surface-variant">{t("uni.noMatchHint")}</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-md bg-primary-container px-6 py-3 text-label-caps uppercase text-on-primary transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              {t("njmap.clearSearch")}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-20">
          {shown.map((city) => (
            <section key={city.id} id={city.id} aria-labelledby={`${city.id}-heading`} className="scroll-mt-28">
              {/* Aksara besarnya tidak boleh menyusut atau terpatah; bila sisa lebarnya
                  sempit, nama Latinnya turun ke bawah. Pola yang sama dengan judul distrik di /map. */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-lg bg-surface-container-low px-5 py-6 sm:px-8 sm:py-7">
                {city.outline && (
                  <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
                    <CityOutline outline={city.outline} seat={city.seat} />
                  </div>
                )}
                {city.zh && (
                  <span lang="zh" aria-hidden className="shrink-0 whitespace-nowrap font-serif text-[56px] leading-[0.85] text-heading sm:text-[76px]">
                    {city.zh}
                  </span>
                )}
                <div className="min-w-0 flex-1 basis-40 pb-0.5">
                  <h2 id={`${city.id}-heading`} className="text-headline-lg text-heading">
                    {city.label}
                  </h2>
                  <p className="text-body-md text-on-surface-variant">{t("uni.count", { n: countOf(city) })}</p>
                </div>
                {city.href && (
                  <Link href={city.href} className={`${quietLink} pb-1.5`}>
                    {t("uni.seeOnMap")} <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </div>

              {city.locator && (
                <svg aria-hidden width="0" height="0" className="absolute">
                  <defs>
                    {Object.entries(city.locator.paths).map(([id, d]) => (
                      <path key={id} id={`${uid}${id}`} d={d} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    ))}
                  </defs>
                </svg>
              )}

              {city.groups.map((group) => (
                <div
                  key={group.key}
                  className={
                    group.label
                      ? `mt-10 ${city.locator ? "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-7" : ""}`
                      : "mt-2"
                  }
                >
                  {group.label && city.locator && (
                    <div className="row-span-2 pt-1">
                      {group.locate && <Locator map={city.locator} prefix={uid} active={group.locate} />}
                    </div>
                  )}
                  {group.label && (
                    <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {group.zh && (
                        <span lang="zh" aria-hidden className="whitespace-nowrap font-serif text-[22px] leading-none text-heading">
                          {group.zh}
                        </span>
                      )}
                      <h3 className="text-headline-sm text-on-background">{group.label}</h3>
                      <span className="flex-1 text-body-sm text-on-surface-variant">{group.campuses.length}</span>
                      {group.href && (
                        <Link href={group.href} className={quietLink}>
                          {t("uni.seeOnMap")} <ArrowRight size={14} aria-hidden />
                        </Link>
                      )}
                    </div>
                  )}

                  <ul className={`grid grid-cols-1 gap-x-12 md:grid-cols-2 ${group.label ? "border-t border-outline-variant" : ""}`}>
                    {group.campuses.map((c) => (
                      <li key={c.id} className="flex items-start gap-4 border-b border-outline-variant py-3.5">
                        <CampusMark logoUrl={c.logoUrl} abbreviation={c.abbreviation} name={c.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-body-md text-on-background">{c.name}</p>
                          {c.nameZh && (
                            <p lang="zh" className="text-body-sm text-on-surface-variant">
                              {c.nameZh}
                            </p>
                          )}
                          {(c.isPartner || c.studentCount != null || c.coordinatorName || c.coordinatorEmail) && (
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
                              {c.isPartner && (
                                <span className="rounded-sm bg-tertiary-container px-2 py-0.5 text-label-caps uppercase text-on-tertiary-container">
                                  {t("uni.partner")}
                                </span>
                              )}
                              {c.studentCount != null && <span>{t("uni.studentsApprox", { n: c.studentCount })}</span>}
                              {c.coordinatorName && (
                                <span>
                                  {t("uni.coordinator")} <span className="text-on-background">{c.coordinatorName}</span>
                                </span>
                              )}
                              {c.coordinatorEmail && (
                                <a href={`mailto:${c.coordinatorEmail}`} className="text-primary-container hover:underline">
                                  {c.coordinatorEmail}
                                </a>
                              )}
                            </p>
                          )}
                        </div>
                        {/* Tanpa logo, singkatannya sudah menjadi monogram di kiri. */}
                        {c.abbreviation && c.logoUrl && (
                          <span className="mt-1 shrink-0 text-label-caps text-gold-ink">{c.abbreviation}</span>
                        )}
                        {c.websiteUrl && (
                          <a
                            href={c.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${t("uni.website")}: ${c.name}`}
                            className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded text-primary-container transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none"
                          >
                            <ExternalLink size={16} aria-hidden />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
