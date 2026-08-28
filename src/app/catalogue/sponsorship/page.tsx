import { asc, desc, eq, sql, count } from "drizzle-orm";
import Image from "next/image";
import { Handshake, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { sponsors, events, eventRegistrations, eventCommittee } from "@/db/schema";
import { getT } from "@/lib/i18n/server";
import { INTL_LOCALE } from "@/lib/i18n/config";
import type { TKey } from "@/lib/i18n/dictionaries/id";

const TIER_NAME: Record<string, string> = { platinum: "Platinum", gold: "Gold", silver: "Silver" };
const TIER_KEY: Record<string, TKey> = { partner: "sponsor.tierPartner" };
const TIER_ORDER = ["platinum", "gold", "silver", "partner"];

export default async function SponsorshipPage() {
  const { t, locale } = await getT();
  // sponsors.description punya varian *_en auto-terjemahan (bisa null);
  // sponsors.name TIDAK - nama organisasi/merek adalah nama diri.
  const pickDesc = (s: { description: string | null; descriptionEn: string | null }) =>
    locale === "en" ? (s.descriptionEn ?? s.description) : s.description;
  const [rows, participation] = await Promise.all([
    db
      .select()
      .from(sponsors)
      .where(eq(sponsors.published, true))
      .orderBy(asc(sponsors.orderIndex), asc(sponsors.name)),
    // Kehadiran nyata per acara: peserta yang benar-benar check-in, plus panitia
    // yang hadir - dokumen ide meminta "gak hanya peserta tapi panit yg dtng juga".
    db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        attendees: count(eventRegistrations.id),
      })
      .from(events)
      .leftJoin(
        eventRegistrations,
        sql`${eventRegistrations.eventId} = ${events.id} AND ${eventRegistrations.status} = 'attended'`,
      )
      .where(eq(events.status, "published"))
      .groupBy(events.id, events.title, events.startAt)
      .orderBy(desc(events.startAt))
      .limit(12),
  ]);

  const committeeCounts = await db
    .select({ eventId: eventCommittee.eventId, n: count(eventCommittee.id) })
    .from(eventCommittee)
    .groupBy(eventCommittee.eventId);
  const committeeByEvent = new Map(committeeCounts.map((c) => [c.eventId, c.n]));
  const withCommittee = participation.map((p) => ({
    ...p,
    committee: committeeByEvent.get(p.id) ?? 0,
    total: p.attendees + (committeeByEvent.get(p.id) ?? 0),
  }));
  const totalReach = withCommittee.reduce((s, p) => s + p.total, 0);

  const byTier = TIER_ORDER.map((t) => ({ tier: t, list: rows.filter((s) => s.tier === t) })).filter(
    (g) => g.list.length > 0,
  );

  return (
    <section className="pt-8">
      <p className="text-body-lg text-on-surface-variant max-w-2xl mb-8">
        {t("sponsor.intro")}
      </p>

      {/* Participation: angka yang dicari sponsor sebelum memutuskan. */}
      {withCommittee.length > 0 && (
        <div className="mb-12">
          <h2 className="text-headline-md text-on-background mb-1">{t("sponsor.reachTitle")}</h2>
          <p className="text-body-md text-on-surface-variant mb-5">
            {t("sponsor.reachDesc", { events: withCommittee.length })}{" "}
            <strong className="text-on-background">{t("sponsor.reachTotal", { n: totalReach })}</strong>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body-md">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left p-3 text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">{t("sponsor.thEvent")}</th>
                  <th className="text-right p-3 text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">{t("sponsor.thAttendees")}</th>
                  <th className="text-right p-3 text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">{t("sponsor.thCommittee")}</th>
                  <th className="text-right p-3 text-label-caps uppercase tracking-wide text-on-surface-variant font-medium">{t("sponsor.thTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {withCommittee.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant/60">
                    <td className="p-3 text-on-background">
                      {p.title}
                      {p.startAt && (
                        <span className="block text-label-caps text-on-surface-variant">
                          {new Date(p.startAt).toLocaleDateString(INTL_LOCALE[locale], { dateStyle: "medium" })}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right text-on-surface-variant">{p.attendees}</td>
                    <td className="p-3 text-right text-on-surface-variant">{p.committee}</td>
                    <td className="p-3 text-right text-on-background font-medium">{p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-label-caps text-on-surface-variant mt-3">
            {t("sponsor.countedNote")}
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <Handshake className="mx-auto mb-4 text-on-surface-variant" size={28} />
          <p className="text-body-lg text-on-background mb-1">{t("sponsor.empty")}</p>
          <p className="text-body-md text-on-surface-variant">
            {t("sponsor.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {byTier.map(({ tier, list }) => (
            <div key={tier}>
              <h2 className="text-label-caps uppercase tracking-wide text-on-surface-variant border-b border-outline-variant pb-2 mb-5">
                {TIER_KEY[tier] ? t(TIER_KEY[tier]) : (TIER_NAME[tier] ?? tier)}
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
                      {pickDesc(s) && <p className="text-body-md text-on-surface-variant mt-1">{pickDesc(s)}</p>}
                      {s.websiteUrl && (
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-label-caps uppercase tracking-wide text-primary-container hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest rounded"
                        >
                          {t("sponsor.website")} <ExternalLink size={12} aria-hidden />
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
