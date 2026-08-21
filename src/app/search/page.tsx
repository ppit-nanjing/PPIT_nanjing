import Link from "next/link";
import { auth } from "@/auth";
import { hasCompletedSensus } from "@/lib/sensus-gate";
import { runGlobalSearch, type SearchResult } from "@/lib/global-search";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";
import { Lock, Search as SearchIcon, SearchX } from "lucide-react";

const GROUPS: { labelKey: string; type: SearchResult["type"] }[] = [
  // Reuse existing section keys so the group heading matches the label used
  // on every other surface in the app for that section.
  { labelKey: "events.title", type: "event" },
  { labelKey: "news.title", type: "news" },
  { labelKey: "nav.jobs", type: "job" },
  { labelKey: "gallery.title", type: "gallery" },
  { labelKey: "nav.inventory", type: "inventory" },
  { labelKey: "search.groupPages", type: "page" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { t } = await getT();
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const session = await auth();
  const hasSensus = session?.user?.id ? await hasCompletedSensus(session.user.id) : false;
  const results = q ? await runGlobalSearch(q, hasSensus) : [];
  const byType = GROUPS.map((g) => ({ ...g, items: results.filter((r) => r.type === g.type) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-20 sm:pt-24 pb-8">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">{t("search.title")}</h1>
        <form action="/search" method="get" role="search" className="flex items-center gap-3">
          <label htmlFor="global-search" className="sr-only">
            {t("search.keywordLabel")}
          </label>
          <input
            id="global-search"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("search.placeholder")}
            className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 text-body-md text-on-background placeholder:text-on-surface-variant outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          <button
            type="submit"
            className="bg-primary-container text-on-primary-container rounded-xl px-5 py-3 text-label-caps hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("search.submit")}
          </button>
        </form>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {!q ? (
          <div className="flex flex-col items-center text-center py-20">
            <SearchIcon className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">{t("search.startTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              {t("search.startDesc")}
            </p>
          </div>
        ) : results.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-20">
            <SearchX className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">{t("search.noResultsTitle")}</h2>
            <p className="text-body-md text-on-surface-variant max-w-sm">
              {t("search.noResultsDesc", { q })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <p className="sr-only" aria-live="polite">
              {t("search.resultsCount", { count: results.length, q })}
            </p>
            {byType.map((group) => (
              <section key={group.type}>
                <h2 className="text-label-caps text-on-surface-variant mb-3">{t(group.labelKey as TKey)}</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <li key={`${item.type}:${item.href}`}>
                      <Link
                        href={item.locked ? `/sensus?returnTo=${encodeURIComponent(item.href)}` : item.href}
                        // A locked result silently redirects to the sensus form.
                        // Say so up front instead of surprising the user.
                        aria-label={
                          item.locked
                            ? `${item.title} — ${t("search.lockedAriaSuffix")}`
                            : undefined
                        }
                        className="block bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                      >
                        <span
                          className={`flex items-center gap-1.5 text-body-md truncate ${
                            item.locked ? "text-on-surface-variant" : "text-on-background"
                          }`}
                        >
                          {item.locked && <Lock size={13} className="shrink-0" aria-hidden />}
                          <span className="truncate">{item.title}</span>
                        </span>
                        {item.subtitle && (
                          <span className="block text-label-caps text-on-surface-variant truncate">
                            {item.subtitle}
                          </span>
                        )}
                        {item.locked && (
                          <span className="block text-label-caps text-primary-container mt-0.5">
                            {t("search.needsSensus")}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
