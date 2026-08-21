import { db } from "@/db";
import { regionalBranches } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MapPin, Map, Users, Phone } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

// Object key order from the reduce below follows whatever order the DB happened
// to return, so the three columns could reshuffle between requests. Pin it.
// Typed as a const tuple so the region -> dictionary-key map below is checked
// by tsc instead of cast. The previous `t(...) ?? region` fallback was dead
// code (t() never returns nullish - see makeT in src/lib/i18n/translate.ts),
// so an unknown region would have rendered the raw key on the page.
const REGION_ORDER = ["north", "east", "south", "central", "west"] as const;
type Region = (typeof REGION_ORDER)[number];
const REGION_KEYS: Record<Region, TKey> = {
  north: "org.branches.region.north",
  east: "org.branches.region.east",
  south: "org.branches.region.south",
  central: "org.branches.region.central",
  west: "org.branches.region.west",
};

export default async function RegionalBranchesPage() {
  const { t } = await getT();
  const branches = await db.select().from(regionalBranches);
  const byRegion = branches.reduce<Record<string, typeof branches>>((acc, b) => {
    (acc[b.region] ??= []).push(b);
    return acc;
  }, {});

  const regions = Object.keys(byRegion).sort((a, b) => {
    // Widened: `regions` comes from DB rows, so it can hold a value outside the
    // tuple, which a literal-typed indexOf() would refuse to even look up.
    const order: readonly string[] = REGION_ORDER;
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    // Unknown regions sort last, alphabetically, instead of jumping to front.
    return (ia === -1 ? REGION_ORDER.length : ia) - (ib === -1 ? REGION_ORDER.length : ib) || a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
          <span className="text-label-caps text-primary-container tracking-widest uppercase mb-2 block">
            {t("org.spreadKicker")}
          </span>
          <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
            {t("org.branches.title")}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mb-6">
            {t("org.branches.intro")}
            {branches.length > 0 && (
              <>
                {" "}
                {t("org.branches.counted", {
                  count: branches.length,
                  regions: regions.length,
                })}
              </>
            )}
          </p>
          <Link
            href="/organization/map"
            className="inline-flex items-center gap-2 text-label-caps text-primary-container hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md motion-reduce:transition-none"
          >
            <Map size={16} aria-hidden /> {t("org.branches.viewMap")}
          </Link>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {branches.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-24">
            <MapPin className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">{t("org.branches.emptyTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-md">
              {t("org.branches.emptyDesc")}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {regions.map((region) => {
          const list = byRegion[region];
          const regionKey = REGION_KEYS[region as Region];
          const regionLabel = regionKey ? t(regionKey) : region;
          return (
          <section key={region} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
            <h2 className="text-headline-md text-on-background mb-4 pb-3 border-b border-outline-variant">
              {regionLabel}
            </h2>
            <ul aria-label={t("org.branches.regionAria", { label: regionLabel })} className="flex flex-col gap-2">
              {list.map((b) => (
                <li
                  key={b.id}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-md text-body-md ${
                    b.cityName === "Nanjing"
                      ? "bg-primary-container/10 text-primary-container font-semibold"
                      : "bg-surface-container-low text-on-background"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={16} aria-hidden />
                    {b.cityName}
                    {b.cityName === "Nanjing" && <span className="text-label-caps ml-auto">{t("org.branches.youAreHere")}</span>}
                  </div>
                  {(b.memberCount != null || b.contactInfo) && (
                    <div className="flex flex-col gap-0.5 pl-6 text-label-caps text-on-surface-variant font-normal">
                      {b.memberCount != null && (
                        <span className="flex items-center gap-1.5">
                          <Users size={12} aria-hidden /> {t("org.branches.memberCount", { n: b.memberCount })}
                        </span>
                      )}
                      {b.contactInfo && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} aria-hidden /> {b.contactInfo}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
          );
        })}
        </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
