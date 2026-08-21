import { ilike, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Package, MapPin, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { conditionLabel } from "@/lib/inventory-labels";
import { getT } from "@/lib/i18n/server";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const conditions = [];
  if (q) conditions.push(ilike(inventoryItems.name, `%${q}%`));
  if (category) conditions.push(eq(inventoryItems.category, category));

  const items = await db
    .select()
    .from(inventoryItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const allItems = await db.select({ category: inventoryItems.category }).from(inventoryItems);
  const categories = [...new Set(allItems.map((i) => i.category).filter((c): c is string => !!c))];

  const { t } = await getT();

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          {t("inventory.title")}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
          {t("inventory.intro")}
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/inventory/contribute"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("inventory.contribute")}
          </Link>
          <Link
            href="/inventory/request-new"
            className="bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("inventory.requestNew")}
          </Link>
        </div>

        <form action="/inventory" role="search" className="relative max-w-xl mb-6">
          <label htmlFor="inventory-search" className="sr-only">
            {t("inventory.searchLabel")}
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
            size={18}
            aria-hidden
          />
          <input
            id="inventory-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("inventory.searchPlaceholder")}
            className="w-full pl-12 pr-28 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary text-label-caps uppercase px-5 py-2 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {t("nav.search")}
          </button>
        </form>

        {categories.length > 0 && (
          <nav aria-label={t("inventory.filterAria")} className="flex flex-wrap gap-2">
            <Link
              href={q ? `/inventory?q=${encodeURIComponent(q)}` : "/inventory"}
              aria-current={!category ? "page" : undefined}
              className={`px-4 py-2 rounded-full text-label-caps uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                !category
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-low text-secondary border border-outline-variant hover:bg-surface-container-lowest"
              }`}
            >
              {t("events.filterAll")}
            </Link>
            {categories.map((c) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              params.set("category", c);
              return (
                <Link
                  key={c}
                  href={`/inventory?${params.toString()}`}
                  aria-current={category === c ? "page" : undefined}
                  className={`px-4 py-2 rounded-full text-label-caps uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                    category === c
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-low text-secondary border border-outline-variant hover:bg-surface-container-lowest"
                  }`}
                >
                  {c}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {items.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center text-center py-24">
            <Package className="text-outline-variant mb-4" size={40} aria-hidden />
            <h2 className="text-headline-md text-on-background mb-2">
              {q || category ? t("inventory.emptyFilteredTitle") : t("inventory.emptyAllTitle")}
            </h2>
            <p className="text-body-md text-on-surface-variant max-w-md">
              {q || category
                ? t("inventory.emptyFilteredDesc")
                : t("inventory.emptyAllDesc")}
            </p>
            {(q || category) && (
              <Link
                href="/inventory"
                className="mt-6 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-6 py-3 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {t("inventory.clearFilters")}
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {t("inventory.itemsFound", { count: items.length })}
            </p>
            <ul aria-label={t("inventory.listLabel")} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <li
                key={item.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-40 bg-surface-container-low flex items-center justify-center overflow-hidden relative">
                  <span
                    className={`absolute top-3 left-3 flex items-center gap-1.5 bg-surface-container-lowest/90 backdrop-blur text-label-caps uppercase px-2.5 py-1 rounded-full shadow-sm ${
                      item.availableQuantity > 0 ? "text-primary-container" : "text-secondary"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.availableQuantity > 0 ? "bg-primary-container" : "bg-secondary"}`} />
                    {item.availableQuantity > 0 ? t("inventory.available") : t("inventory.unavailable")}
                  </span>
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <Package className="text-outline-variant" size={28} aria-hidden />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  {item.category && <p className="text-label-caps text-on-surface-variant uppercase mb-1">{item.category}</p>}
                  <h2 className="text-body-md font-semibold text-on-background mb-2">{item.name}</h2>
                  {item.description && (
                    <p className="text-body-md text-on-surface-variant line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <div className="flex flex-col gap-1.5 text-label-caps text-on-surface-variant mb-3">
                    {item.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} aria-hidden /> {item.location}
                      </span>
                    )}
                    <span>{t("inventory.conditionLabel")}: {conditionLabel(item.condition)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`text-label-caps uppercase px-2 py-1 rounded ${
                        item.availableQuantity > 0
                          ? "bg-primary-container/10 text-primary-container"
                          : "bg-outline-variant/30 text-secondary"
                      }`}
                    >
                      {t("inventory.stockCount", { available: item.availableQuantity, total: item.totalQuantity })}
                    </span>
                  </div>
                  {item.availableQuantity > 0 && (
                    <Link
                      href={`/inventory/${item.id}/borrow`}
                      aria-label={t("inventory.borrowAria", { name: item.name })}
                      className="mt-4 text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-2.5 rounded-md hover:bg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                    >
                      {t("inventory.borrowButton")}
                    </Link>
                  )}
                </div>
              </li>
            ))}
            </ul>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
