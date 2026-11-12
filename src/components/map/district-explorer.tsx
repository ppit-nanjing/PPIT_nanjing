"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Search, X } from "lucide-react";
import type { CoverageFeature } from "@/app/coverage/page";
import { CoverageMap } from "@/components/coverage-map";
import type { PlaceCard } from "@/components/places/places-grid";
import { useT } from "@/lib/i18n/client";

export type DistrictCampus = {
  id: string;
  /** Nama distrik baku (label di berkas batas wilayah). */
  district: string;
  name: string;
  nameZh: string | null;
  abbreviation: string | null;
  websiteUrl: string | null;
};

/** Tanpa huruf besar, aksen, tanda petik, dan spasi, supaya "gu lou" menemukan Gulou. */
const plain = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’\-\s]/g, "");

const hrefFor = (label: string | null) => (label ? `/map?distrik=${label.toLowerCase()}` : "/map");

/**
 * Peta Nanjing dan isi distrik yang dipilih. Semua datanya (puluhan baris) sudah
 * dikirim dari server, jadi memilih distrik hanya menyaring di sisi klien dan
 * terasa seketika; alamatnya tetap berubah supaya bisa dibagikan.
 */
export function DistrictExplorer({
  features,
  descriptions,
  campuses,
  places,
}: {
  features: CoverageFeature[];
  /** Teks pengantar per nama distrik baku, dari tabel `districts`. */
  descriptions: Record<string, string>;
  campuses: DistrictCampus[];
  /** `district` tiap tempat sudah berupa nama baku. */
  places: PlaceCard[];
}) {
  const t = useT();
  // Dicocokkan dengan `features` yang sudah dikirim, bukan lewat lib/nanjing-districts:
  // modul itu mengimpor berkas batas wilayah dan akan menggandakannya di bundel klien.
  const slug = useSearchParams().get("distrik")?.trim().toLowerCase();
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  const districts = features.map((f) => {
    const label = f.properties.label;
    const nCampus = campuses.filter((c) => c.district === label).length;
    const nPlace = places.filter((p) => p.district === label).length;
    return { id: f.properties.id, label, zh: f.properties.zh, nCampus, nPlace, total: nCampus + nPlace };
  });
  const current = districts.find((d) => d.label.toLowerCase() === slug) ?? null;
  const selected = current?.label ?? null;

  // Nama di peta hanya aksara Mandarin, jadi pencarian inilah jalan bagi yang
  // hanya tahu pinyinnya. Aksara Mandarin juga diterima.
  const needle = plain(query);
  const matches = needle ? districts.filter((d) => plain(d.label).includes(needle) || d.zh.includes(query.trim())) : null;

  function select(label: string | null) {
    // replaceState, bukan pushState: mencoba enam distrik tidak boleh berarti enam
    // kali menekan Kembali untuk keluar dari halaman ini.
    window.history.replaceState(null, "", hrefFor(label));
    // Di layar sempit isi distrik ada di bawah peta setinggi layar, jadi tanpa ini
    // ketukan di peta tampak tidak berbuat apa-apa.
    if (label && window.matchMedia("(max-width: 1023px)").matches) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
  }

  const summary = (d: { nCampus: number; nPlace: number }) =>
    d.nCampus + d.nPlace === 0
      ? t("njmap.emptyUnit")
      : [d.nCampus > 0 && t("njmap.campusCount", { n: d.nCampus }), d.nPlace > 0 && t("njmap.placeCount", { n: d.nPlace })]
          .filter(Boolean)
          .join(" · ");

  const followPlain = (e: React.MouseEvent, label: string | null) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    select(label);
  };

  const quietLink =
    "inline-flex items-center gap-1.5 rounded text-label-caps uppercase text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
      {/* Lebih dari setengah lebar halaman: di bawah itu kelima distrik pusat kota
          terlalu kecil untuk diberi nama. Petanya jadi lebih tinggi dari layar,
          karena itu yang menempel saat digulir adalah kolom isi, bukan peta. */}
      <div className="mx-auto w-full max-w-[40rem] lg:max-w-none">
        {/* Enter memilih hasil pertama. */}
        <form
          role="search"
          className="mb-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!matches?.length) return;
            setQuery("");
            select(matches[0].label);
          }}
        >
          <div className="flex max-w-sm items-center gap-2 rounded-md bg-soft-gray px-3 focus-within:ring-2 focus-within:ring-primary-container">
            <Search size={16} aria-hidden className="shrink-0 text-on-surface-variant" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("njmap.searchLabel")}
              aria-label={t("njmap.searchLabel")}
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
            {matches &&
              (matches.length === 0
                ? t("njmap.noMatch")
                : matches.map((d) => `${d.label} ${d.zh.replace(/区$/, "")}`).join(" · "))}
          </p>
        </form>

        <CoverageMap
          features={features}
          counts={Object.fromEntries(districts.map((d) => [d.id, d.total > 0 ? d.total : null]))}
          ariaLabel={t("njmap.mapAria", { n: features.length })}
          unit={t("njmap.unit")}
          emptyUnit={t("njmap.emptyUnit")}
          // Mengeklik distrik yang sedang terpilih melepas pilihannya.
          links={Object.fromEntries(districts.map((d) => [d.id, hrefFor(d.label === selected ? null : d.label)]))}
          onSelect={(id) => {
            const hit = districts.find((d) => d.id === id);
            select(hit && hit.label !== selected ? hit.label : null);
          }}
          highlight={current?.id}
          highlightLabel={t("njmap.selectedLegend")}
          spotlight={hovered ?? (matches?.length === 1 ? matches[0].id : null)}
          only={matches?.map((d) => d.id)}
        />
      </div>

      <div ref={panel} className="min-w-0 scroll-mt-28 lg:sticky lg:top-28">
        {/* initial={false}: tampilan pertama dirender apa adanya (juga tanpa JS);
            hanya pergantian distrik yang dianimasikan. */}
        <AnimatePresence initial={false}>
          <motion.section
            key={current?.id ?? "all"}
            aria-labelledby="district-heading"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {current ? (
              <>
                <Link href="/map" scroll={false} prefetch={false} onClick={(e) => followPlain(e, null)} className={quietLink}>
                  <ArrowLeft size={14} aria-hidden /> {t("njmap.allTitle")}
                </Link>

                {/* Aksara besarnya tidak boleh menyusut: aksara Mandarin boleh dipatah di
                    antara tiap aksara, jadi begitu ringkasan di sebelahnya panjang, nama
                    distrik terpatah menjadi tegak. Yang mengalah adalah teksnya, dan bila
                    sisa lebarnya kurang dari 10rem teks itu turun ke bawah aksara. */}
                <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3">
                  <span
                    lang="zh"
                    aria-hidden
                    className="shrink-0 whitespace-nowrap font-serif text-[64px] leading-[0.85] text-heading sm:text-[88px]"
                  >
                    {current.zh.replace(/区$/, "")}
                  </span>
                  <div className="min-w-0 flex-1 basis-40 pb-1">
                    <h2 id="district-heading" className="text-headline-lg text-heading">
                      {current.label}
                    </h2>
                    <p className="text-body-md text-on-surface-variant">{summary(current)}</p>
                  </div>
                </div>

                {descriptions[current.label] && (
                  <p className="mt-6 max-w-[65ch] text-body-lg text-on-background">{descriptions[current.label]}</p>
                )}

                {current.total === 0 && (
                  <p className="mt-8 max-w-[60ch] text-body-md text-on-surface-variant">{t("njmap.emptyHint")}</p>
                )}

                {current.nCampus > 0 && (
                  <div className="mt-10">
                    <h3 className="text-headline-md text-heading">{t("njmap.campuses")}</h3>
                    <ul className="mt-3 divide-y divide-outline-variant border-y border-outline-variant">
                      {campuses
                        .filter((c) => c.district === current.label)
                        .map((c) => (
                          <li key={c.id} className="flex min-h-16 items-center gap-4 py-2.5">
                            <span className="min-w-0 flex-1">
                              <span className="block text-body-md text-on-background">{c.name}</span>
                              {c.nameZh && (
                                <span lang="zh" className="block text-body-sm text-on-surface-variant">
                                  {c.nameZh}
                                </span>
                              )}
                            </span>
                            {c.abbreviation && <span className="text-label-caps text-gold-ink">{c.abbreviation}</span>}
                            {c.websiteUrl && (
                              <a
                                href={c.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${t("uni.website")}: ${c.name}`}
                                className="flex h-11 w-11 items-center justify-center rounded text-primary-container transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container motion-reduce:transition-none"
                              >
                                <ExternalLink size={16} aria-hidden />
                              </a>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Hanya foto kecil dan nama: rinciannya (kategori, deskripsi, stasiun metro,
                    alamat, tautan peta) ada di /places, yang ditautkan di bawah daftar ini. */}
                {current.nPlace > 0 && (
                  <div className="mt-10">
                    <h3 className="text-headline-md text-heading">{t("njmap.places")}</h3>
                    <ul className="mt-3 divide-y divide-outline-variant border-y border-outline-variant">
                      {places
                        .filter((p) => p.district === current.label)
                        .map((p) => (
                          <li key={p.id} className="flex items-center gap-4 py-3">
                            <span className="relative block h-14 w-[4.75rem] shrink-0 overflow-hidden rounded-md bg-surface-container">
                              {p.imageUrl ? (
                                <Image src={p.imageUrl} alt="" fill sizes="76px" className="object-cover" />
                              ) : (
                                <MapPin
                                  size={20}
                                  strokeWidth={1.5}
                                  aria-hidden
                                  className="absolute inset-0 m-auto text-on-surface-variant"
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-body-md text-on-background">{p.name}</span>
                              {p.nameZh && (
                                <span lang="zh" className="block text-body-sm text-on-surface-variant">
                                  {p.nameZh}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                  <Link href="/universities" className={quietLink}>
                    {t("njmap.allCampuses")} <ArrowRight size={14} aria-hidden />
                  </Link>
                  <Link href="/places" className={quietLink}>
                    {t("njmap.allPlaces")} <ArrowRight size={14} aria-hidden />
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h2 id="district-heading" className="text-headline-lg text-heading">
                  {t("njmap.allTitle")}
                </h2>
                <p className="mt-2 max-w-[60ch] text-body-md text-on-surface-variant">
                  {t("njmap.allLead", { campuses: campuses.length, places: places.length })}
                </p>

                <ol className="mt-6 divide-y divide-outline-variant border-y border-outline-variant">
                  {[...(matches ?? districts)]
                    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
                    .map((d) => (
                      <li key={d.id}>
                        <Link
                          href={hrefFor(d.label)}
                          scroll={false}
                          prefetch={false}
                          onClick={(e) => followPlain(e, d.label)}
                          onMouseEnter={() => setHovered(d.id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(d.id)}
                          onBlur={() => setHovered(null)}
                          className="group grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-4 px-2 py-3.5 transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container motion-reduce:transition-none"
                        >
                          <span
                            lang="zh"
                            aria-hidden
                            className={`whitespace-nowrap font-serif text-[26px] leading-none ${d.total > 0 ? "text-heading" : "text-on-surface-variant"}`}
                          >
                            {d.zh.replace(/区$/, "")}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-headline-sm text-on-background">{d.label}</span>
                            <span className="block text-body-sm text-on-surface-variant">{summary(d)}</span>
                          </span>
                          <ArrowRight
                            size={18}
                            aria-hidden
                            className="text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-primary-container motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                          />
                        </Link>
                      </li>
                    ))}
                </ol>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
