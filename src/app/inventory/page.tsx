import { ilike, and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Package, MapPin, Search } from "lucide-react";

const CONDITION_LABEL: Record<string, string> = { good: "Baik", damaged: "Rusak", retired: "Pensiun" };

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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-display-hero-mobile md:text-display-hero text-on-background mb-4">
          Inventaris &amp; Peminjaman
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
          Pinjam peralatan organisasi untuk kebutuhan kegiatan PPIT Nanjing.
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href="/inventory/contribute"
            className="bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-primary transition-colors"
          >
            Sumbangkan / Pinjamkan Barang
          </a>
          <a
            href="/inventory/request-new"
            className="bg-surface-container-low text-on-background text-label-caps uppercase tracking-wide px-5 py-2.5 rounded-md border border-outline-variant hover:bg-surface-container-lowest transition-colors"
          >
            Usulkan Barang Baru
          </a>
        </div>

        <form action="/inventory" className="relative max-w-xl mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari barang..."
            className="w-full pl-12 pr-28 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          {category && <input type="hidden" name="category" value={category} />}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-container text-on-primary text-label-caps uppercase px-5 py-2 rounded-md hover:bg-primary transition-colors"
          >
            Cari
          </button>
        </form>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <a
              href={q ? `/inventory?q=${encodeURIComponent(q)}` : "/inventory"}
              className={`px-4 py-2 rounded-full text-label-caps uppercase tracking-wide transition-colors ${
                !category
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-low text-secondary border border-outline-variant hover:bg-surface-container-lowest"
              }`}
            >
              Semua
            </a>
            {categories.map((c) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              params.set("category", c);
              return (
                <a
                  key={c}
                  href={`/inventory?${params.toString()}`}
                  className={`px-4 py-2 rounded-full text-label-caps uppercase tracking-wide transition-colors ${
                    category === c
                      ? "bg-primary-container text-on-primary"
                      : "bg-surface-container-low text-secondary border border-outline-variant hover:bg-surface-container-lowest"
                  }`}
                >
                  {c}
                </a>
              );
            })}
          </div>
        )}
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Package className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">
              {q || category ? "Tidak ada barang yang cocok dengan pencarian ini." : "Belum ada barang inventaris yang terdaftar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
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
                    {item.availableQuantity > 0 ? "Tersedia" : "Tidak Tersedia"}
                  </span>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="text-outline-variant" size={28} />
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
                        <MapPin size={13} /> {item.location}
                      </span>
                    )}
                    <span>Kondisi: {CONDITION_LABEL[item.condition]}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className={`text-label-caps uppercase px-2 py-1 rounded ${
                        item.availableQuantity > 0
                          ? "bg-primary-container/10 text-primary-container"
                          : "bg-outline-variant/30 text-secondary"
                      }`}
                    >
                      {item.availableQuantity} / {item.totalQuantity} tersedia
                    </span>
                  </div>
                  {item.availableQuantity > 0 && (
                    <a
                      href={`/inventory/${item.id}/borrow`}
                      className="mt-4 text-center bg-primary-container text-on-primary text-label-caps uppercase tracking-wide py-2.5 rounded-md hover:bg-primary transition-colors"
                    >
                      Ajukan Peminjaman
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
