import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { merchandise } from "@/db/schema";
import { getT } from "@/lib/i18n/server";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const STATUS: Record<string, { labelKey: TKey; cls: string }> = {
  available: { labelKey: "merch.statusAvailable", cls: "bg-tertiary-container text-on-tertiary-container" },
  preorder: { labelKey: "merch.statusPreorder", cls: "bg-secondary-container text-on-secondary-container" },
  unavailable: { labelKey: "merch.statusUnavailable", cls: "bg-surface-container-high text-on-surface-variant" },
};

export default async function MerchandisePage() {
  const { t, locale } = await getT();
  // *_en adalah auto-terjemahan (bisa null) - fallback ke teks ID admin.
  const pick = (id: string | null, en: string | null) => (locale === "en" ? (en ?? id) : id);
  const items = await db
    .select()
    .from(merchandise)
    .where(eq(merchandise.published, true))
    .orderBy(asc(merchandise.orderIndex), asc(merchandise.name));

  return (
    <section className="pt-8">
      <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
        {t("merch.intro")}
      </p>

      {items.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <ShoppingBag className="mx-auto mb-4 text-on-surface-variant" size={28} />
          <p className="text-body-lg text-on-background mb-1">{t("merch.empty")}</p>
          <p className="text-body-md text-on-surface-variant">
            {t("merch.emptyDesc")}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((m) => {
            const s = STATUS[m.status] ?? STATUS.unavailable;
            return (
              <li key={m.id} className="flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                <div className="relative w-full aspect-square bg-surface-container">
                  {m.imageUrl ? (
                    <Image src={m.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag size={32} className="text-on-surface-variant/50" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-5 flex-1">
                  <span className={`self-start text-label-caps uppercase tracking-wide px-2 py-0.5 rounded ${s.cls}`}>
                    {t(s.labelKey)}
                  </span>
                  <h2 className="text-headline-sm text-on-background">{pick(m.name, m.nameEn)}</h2>
                  {pick(m.description, m.descriptionEn) && (
                    <p className="text-body-md text-on-surface-variant flex-1">{pick(m.description, m.descriptionEn)}</p>
                  )}
                  {m.priceCny != null && (
                    <p className="text-body-lg text-on-background">&yen; {m.priceCny}</p>
                  )}
                  {m.contactNote && <p className="text-body-sm text-on-surface-variant">{m.contactNote}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
