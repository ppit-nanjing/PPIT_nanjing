import { asc, eq, and } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  ExternalLink,
  Landmark,
  Church,
  ShoppingBag,
  UtensilsCrossed,
  Trees,
  BookOpen,
  Store,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import { places } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Every category the place_category enum can hold. Keep this in sync with
// placeCategoryEnum in schema.ts and the dropdown in /console/katalog.
// `icon` + `accent` drive the coloured card header shown when a place has no
// photo yet (Vercel Blob isn't wired up, so most rows have imageUrl = null).
// `accent` is a Tailwind utility pair applied to that header.
const CATEGORY: Record<
  string,
  { labelKey: TKey; icon: LucideIcon; accent: string }
> = {
  tourism: { labelKey: "places.catTourism", icon: Landmark, accent: "bg-blue-500/12 text-blue-600 dark:text-blue-400" },
  culture: { labelKey: "places.catCulture", icon: BookOpen, accent: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  nature: { labelKey: "places.catNature", icon: Trees, accent: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
  food: { labelKey: "places.catFood", icon: UtensilsCrossed, accent: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
  shopping: { labelKey: "places.catShopping", icon: ShoppingBag, accent: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400" },
  spiritual: { labelKey: "places.catSpiritual", icon: Church, accent: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  practical: { labelKey: "places.catPractical", icon: Store, accent: "bg-teal-500/12 text-teal-600 dark:text-teal-400" },
};

// Filter bar order — "all" first, then the same order as CATEGORY.
const FILTER_ORDER = ["", ...Object.keys(CATEGORY)] as const;

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("places.metaTitle"), description: t("places.metaDesc") };
}

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { t, locale } = await getT();
  // Kolom *_en cuma auto-terjemahan (bisa null kalau AI belum/gagal jalan) -
  // fallback ke teks sumber (ID) supaya visitor EN tidak pernah lihat kosong.
  const pick = (id: string | null, en: string | null) => (locale === "en" ? (en ?? id) : id);
  const { kategori } = await searchParams;
  const valid = kategori && kategori in CATEGORY ? kategori : undefined;

  const rows = await db
    .select()
    .from(places)
    .where(
      valid
        ? and(eq(places.published, true), eq(places.category, valid as "tourism"))
        : eq(places.published, true),
    )
    .orderBy(asc(places.orderIndex), asc(places.name));

  const districts = [...new Set(rows.map((p) => p.district).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <p className="text-label-caps uppercase tracking-wide text-on-surface-variant mb-2">{t("explore.kicker")}</p>
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          {t("places.title")}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
          {rows.length > 0
            ? t("places.lead", {
                n: rows.length,
                districts: districts.length ? t("places.leadDistricts", { n: districts.length }) : "",
              })
            : t("places.leadEmpty")}
        </p>

        <nav aria-label={t("places.filterAria")} className="flex flex-wrap gap-2">
          {FILTER_ORDER.map((id) => {
            const active = (valid ?? "") === id;
            const label = id ? t(CATEGORY[id].labelKey) : t("places.filterAll");
            const Icon = id ? CATEGORY[id].icon : undefined;
            return (
              <Link
                key={id || "all"}
                href={id ? `/places?kategori=${id}` : "/places"}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide px-4 py-2 rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  active
                    ? "border-primary-container bg-primary-container text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {Icon && <Icon size={14} aria-hidden />}
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-20">
        {rows.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
            <MapPin className="mx-auto mb-4 text-on-surface-variant" size={28} />
            <p className="text-body-lg text-on-background mb-1">{t("places.empty")}</p>
            <p className="text-body-md text-on-surface-variant">
              {t("places.emptyDesc")}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((p) => {
              const cat = CATEGORY[p.category];
              const Icon = cat?.icon ?? MapPin;
              const catLabel = cat ? t(cat.labelKey) : p.category;
              return (
                <li
                  key={p.id}
                  className="group flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden transition-shadow hover:shadow-md motion-reduce:transition-none"
                >
                  {p.imageUrl ? (
                    <div className="relative w-full aspect-[4/3] bg-surface-container">
                      <Image src={p.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                    </div>
                  ) : (
                    // No photo yet (Blob not provisioned): a coloured, category-
                    // themed header keeps the card visually complete instead of
                    // leaving a blank gap.
                    <div
                      className={`relative w-full aspect-[4/3] flex items-center justify-center ${cat?.accent ?? "bg-surface-container text-on-surface-variant"}`}
                    >
                      <Icon size={44} aria-hidden strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 p-5 flex-1">
                    <span className="inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-on-surface-variant">
                      <Icon size={13} aria-hidden />
                      {catLabel}
                      {p.district ? ` · ${p.district}` : ""}
                    </span>
                    <h2 className="text-headline-sm text-on-background">
                      {pick(p.name, p.nameEn)}
                      {p.nameZh && <span className="text-body-md text-on-surface-variant"> {p.nameZh}</span>}
                    </h2>
                    {pick(p.description, p.descriptionEn) && (
                      <p className="text-body-md text-on-surface-variant flex-1">{pick(p.description, p.descriptionEn)}</p>
                    )}
                    {p.address && (
                      <p className="text-body-sm text-on-surface-variant flex items-start gap-1.5">
                        <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                        <span>
                          {pick(p.address, p.addressEn)}
                          {p.addressZh && <span className="block">{p.addressZh}</span>}
                        </span>
                      </p>
                    )}
                    {p.mapUrl && (
                      <a
                        href={p.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-start inline-flex items-center gap-1.5 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                      >
                        {t("places.openMap")} <ExternalLink size={13} aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
