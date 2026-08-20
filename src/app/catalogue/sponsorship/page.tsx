import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import { Handshake, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { sponsors } from "@/db/schema";

const TIER_LABEL: Record<string, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  partner: "Mitra",
};
const TIER_ORDER = ["platinum", "gold", "silver", "partner"];

export default async function SponsorshipPage() {
  const rows = await db
    .select()
    .from(sponsors)
    .where(eq(sponsors.published, true))
    .orderBy(asc(sponsors.orderIndex), asc(sponsors.name));

  const byTier = TIER_ORDER.map((t) => ({ tier: t, list: rows.filter((s) => s.tier === t) })).filter(
    (g) => g.list.length > 0,
  );

  return (
    <section className="pt-8">
      <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
        Mitra dan sponsor yang mendukung program PPIT Nanjing. Tertarik bekerja sama? Hubungi pengurus
        lewat halaman Tentang Kami.
      </p>

      {rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <Handshake className="mx-auto mb-4 text-on-surface-variant" size={28} />
          <p className="text-body-lg text-on-background mb-1">Belum ada sponsor terdaftar</p>
          <p className="text-body-md text-on-surface-variant">
            Pengurus bisa menambahkannya lewat Console &rarr; Katalog.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byTier.map(({ tier, list }) => (
            <div key={tier}>
              <h2 className="text-label-caps uppercase tracking-wide text-on-surface-variant border-b border-outline-variant pb-2 mb-5">
                {TIER_LABEL[tier]}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((s) => (
                  <li key={s.id} className="flex gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                    {s.logoUrl ? (
                      <Image src={s.logoUrl} alt="" width={56} height={56} className="w-14 h-14 rounded-md object-contain bg-surface-container shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-surface-container flex items-center justify-center shrink-0">
                        <Handshake size={22} className="text-on-surface-variant" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-body-lg text-on-background">{s.name}</h3>
                      {s.description && <p className="text-body-md text-on-surface-variant mt-1">{s.description}</p>}
                      {s.websiteUrl && (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                        >
                          Situs <ExternalLink size={12} aria-hidden />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
