import { asc, eq, and } from "drizzle-orm";
import Link from "next/link";
import {
  MapPin,
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
import { PlacesGrid } from "@/components/places/places-grid";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Every category the place_category enum can hold. Keep this in sync with
// placeCategoryEnum in schema.ts and the dropdown in /console/katalog.
// Only the filter bar renders from this map; the cards' own icons and accent
// colours live in PlacesGrid, which is a client component (lucide icons are
// functions and can't be passed across the RSC boundary).
const CATEGORY: Record<string, { labelKey: TKey; icon: LucideIcon }> = {
  tourism: { labelKey: "places.catTourism", icon: Landmark },
  culture: { labelKey: "places.catCulture", icon: BookOpen },
  nature: { labelKey: "places.catNature", icon: Trees },
  food: { labelKey: "places.catFood", icon: UtensilsCrossed },
  shopping: { labelKey: "places.catShopping", icon: ShoppingBag },
  spiritual: { labelKey: "places.catSpiritual", icon: Church },
  practical: { labelKey: "places.catPractical", icon: Store },
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
    // Di dalam satu kategori: abjad distrik, lalu abjad nama - jadi tempat
    // yang sedistrik otomatis berdekatan tanpa perlu diatur admin. Distrik
    // null jatuh ke akhir (default NULLS LAST Postgres). Pengurutan antar
    // kategorinya sendiri dikerjakan di JS di bawah, bukan di sini: `category`
    // itu enum Postgres, dan ASC pada enum mengikuti urutan deklarasi di
    // schema.ts - yang berbeda dari urutan CATEGORY/filter bar di atas.
    .orderBy(asc(places.district), asc(places.name));

  // Samakan urutan kelompok kategori dengan urutan tombol di filter bar.
  // Kategori di luar CATEGORY (mis. nilai enum baru yang belum didaftarkan)
  // ditaruh di akhir, bukan dibuang, supaya tidak ada tempat yang hilang.
  const CATEGORY_RANK = Object.keys(CATEGORY);
  const rankOf = (c: string) => {
    const i = CATEGORY_RANK.indexOf(c);
    return i === -1 ? CATEGORY_RANK.length : i;
  };
  rows.sort((a, b) => rankOf(a.category) - rankOf(b.category));

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
          // Localisation and the *_en fallback are resolved here, on the
          // server, so the client component receives plain strings - no
          // functions (lucide icons, `t`) cross the RSC boundary.
          <PlacesGrid
            places={rows.map((p) => ({
              id: p.id,
              category: p.category,
              categoryLabel: CATEGORY[p.category] ? t(CATEGORY[p.category].labelKey) : p.category,
              district: p.district,
              name: pick(p.name, p.nameEn) ?? p.name,
              nameZh: p.nameZh,
              description: pick(p.description, p.descriptionEn),
              address: pick(p.address, p.addressEn),
              addressZh: p.addressZh,
              imageUrl: p.imageUrl,
              mapUrl: p.mapUrl,
            }))}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
