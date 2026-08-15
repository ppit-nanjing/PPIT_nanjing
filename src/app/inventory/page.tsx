import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Package } from "lucide-react";

const CONDITION_LABEL: Record<string, string> = { good: "Baik", damaged: "Rusak", retired: "Pensiun" };

export default async function InventoryPage() {
  const items = await db.select().from(inventoryItems);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <SiteNav />

      <header className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pt-16 pb-8">
        <h1 className="text-headline-lg md:text-display-hero-mobile text-on-background mb-4">
          Inventaris &amp; Peminjaman
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Pinjam peralatan organisasi untuk kebutuhan kegiatan PPIT Nanjing.
        </p>
      </header>

      <main className="max-w-[var(--container-max)] mx-auto px-[var(--spacing-container-padding)] pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-24">
            <Package className="text-outline-variant mb-4" size={40} />
            <p className="text-body-md text-on-surface-variant">Belum ada barang inventaris yang terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-40 bg-surface-container-low flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="text-outline-variant" size={28} />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-body-md font-semibold text-on-background mb-1">{item.name}</h2>
                  {item.category && <p className="text-label-caps text-on-surface-variant mb-3">{item.category}</p>}
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
                    <span className="text-label-caps text-on-surface-variant">
                      {CONDITION_LABEL[item.condition]}
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
