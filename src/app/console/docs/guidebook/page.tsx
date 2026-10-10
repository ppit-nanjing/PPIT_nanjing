import { eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { guideChunks, guideMeta, helpArticles } from "@/db/schema";
import { CollapsibleSection } from "@/components/console/collapsible-section";
import { StatusRow } from "@/components/console/status-row";
import { CHUNKER_VERSION } from "@/lib/guide-chunker";
import { GUIDE_PHASES, expiryStatus } from "@/lib/guidebook-topic";

const NAME_CAP = 5;

/**
 * Papan pemantau guidebook maba: topik per fase plus satu daftar hal yang bikin
 * korpusnya membusuk pelan-pelan - belum ditinjau, lewat masa berlaku, isinya
 * kosong, potongan yatim, dan potongan yang dibangun chunker versi lama.
 * Angka-angka inilah yang dipakai untuk memutuskan apa yang dikerjakan minggu ini.
 */
export default async function GuidebookConsolePage() {
  const topics = await db
    .select({
      id: helpArticles.id,
      slug: helpArticles.slug,
      title: helpArticles.title,
      section: helpArticles.section,
      phase: helpArticles.phase,
      sortOrder: helpArticles.sortOrder,
      isPublic: helpArticles.isPublic,
      contentLength: sql<number>`length(coalesce(${helpArticles.content}, ''))::int`,
      reviewedAt: helpArticles.reviewedAt,
      expiresAt: helpArticles.expiresAt,
      sourceLabel: helpArticles.sourceLabel,
    })
    .from(helpArticles)
    .where(isNotNull(helpArticles.phase))
    .orderBy(helpArticles.sortOrder, helpArticles.title);

  const chunkCounts = await db
    .select({ articleId: guideChunks.articleId, count: sql<number>`count(*)::int` })
    .from(guideChunks)
    .groupBy(guideChunks.articleId);
  const chunkByArticle = new Map(chunkCounts.map((c) => [c.articleId, c.count]));

  // Potongan yatim: artikelnya sudah bukan topik, atau isinya dikosongkan tapi
  // potongan lamanya masih ada. Selama masih ada, pencarian bisa menjawab dari
  // topik yang sudah dicabut.
  const [orphans] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(guideChunks)
    .innerJoin(helpArticles, eq(guideChunks.articleId, helpArticles.id))
    .where(sql`${helpArticles.phase} is null or coalesce(${helpArticles.content}, '') = ''`);

  const [meta] = await db
    .select({ corpusVersion: guideMeta.corpusVersion, chunkerVersion: guideMeta.chunkerVersion, aiEnabled: guideMeta.aiEnabled })
    .from(guideMeta)
    .limit(1);

  const unreviewed = topics.filter((t) => !t.reviewedAt);
  const expired = topics.filter((t) => expiryStatus(t.expiresAt) === "expired");
  const expiringSoon = topics.filter((t) => expiryStatus(t.expiresAt) === "soon");
  const empty = topics.filter((t) => t.contentLength === 0);
  const staleChunks = topics.filter((t) => (chunkByArticle.get(t.id) ?? 0) === 0 && t.contentLength > 0);
  const chunkerStale = meta !== undefined && meta.chunkerVersion !== CHUNKER_VERSION;
  const orphanCount = orphans?.count ?? 0;
  const hasProblems =
    unreviewed.length > 0 ||
    expired.length > 0 ||
    expiringSoon.length > 0 ||
    empty.length > 0 ||
    staleChunks.length > 0 ||
    chunkerStale ||
    orphanCount > 0;

  const names = (list: { title: string }[]) =>
    list
      .slice(0, NAME_CAP)
      .map((t) => t.title)
      .join(", ") + (list.length > NAME_CAP ? `, +${list.length - NAME_CAP} lagi` : "");

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-headline-md sm:text-headline-lg text-on-background mb-2">Guidebook Maba</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            {topics.length} topik dari {GUIDE_PHASES.length} fase. Isi tiap topik disunting di halaman
            artikelnya, dan potongan pencariannya dibangun ulang otomatis saat disimpan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <Link
            href="/console/docs/new"
            className="flex items-center gap-2 bg-primary-container text-on-primary text-label-caps uppercase tracking-wide px-5 py-3 rounded-md hover:bg-primary transition-colors"
          >
            <Plus size={14} aria-hidden /> Topik Baru
          </Link>
        </div>
      </div>

      <CollapsibleSection
        title="Diagnostik Korpus"
        description="Yang perlu dikerjakan sebelum topik ini dipakai maba."
        defaultOpen={hasProblems}
        className="mb-8"
      >
        <div className="flex flex-col gap-2 text-body-md">
          <StatusRow
            label="Total topik"
            ok
            value={`${topics.length} topik, ${chunkCounts.reduce((sum, c) => sum + c.count, 0)} potongan pencarian`}
          />
          <StatusRow
            label="Belum ditinjau"
            ok={unreviewed.length === 0}
            value={
              unreviewed.length === 0
                ? "Semua topik sudah ditinjau"
                : `${unreviewed.length}: ${names(unreviewed)}`
            }
          />
          <StatusRow
            label="Kedaluwarsa"
            ok={expired.length === 0}
            value={
              expired.length === 0 ? "Tidak ada yang lewat masa berlaku" : `${expired.length}: ${names(expired)}`
            }
          />
          <StatusRow
            label="Segera kedaluwarsa"
            ok={expiringSoon.length === 0}
            value={
              expiringSoon.length === 0
                ? "Tidak ada yang berakhir dalam 30 hari"
                : `${expiringSoon.length}: ${names(expiringSoon)}`
            }
          />
          <StatusRow
            label="Isi kosong"
            ok={empty.length === 0}
            value={empty.length === 0 ? "Tidak ada" : `${empty.length}: ${names(empty)}`}
          />
          <StatusRow
            label="Belum berpotongan"
            ok={staleChunks.length === 0}
            value={
              staleChunks.length === 0
                ? "Setiap topik berisi punya potongan"
                : `${staleChunks.length}: ${names(staleChunks)} - simpan salah satu untuk membangun ulang`
            }
          />
          <StatusRow
            label="Potongan yatim"
            ok={orphanCount === 0}
            value={
              orphanCount === 0
                ? "Tidak ada"
                : `${orphanCount} potongan dari topik yang sudah dicabut atau dikosongkan`
            }
          />
          <StatusRow
            label="Chunker"
            ok={!chunkerStale}
            value={
              meta
                ? `v${meta.chunkerVersion} di database, v${CHUNKER_VERSION} di kode${
                    chunkerStale ? " - potongan lama perlu dibangun ulang" : ""
                  }`
                : "guide_meta belum ada - jalankan migrasi 0046"
            }
          />
          <StatusRow
            label="Versi korpus"
            ok
            value={meta ? `v${meta.corpusVersion}${meta.aiEnabled ? "" : " (chatbot dimatikan)"}` : "belum tercatat"}
          />
        </div>
      </CollapsibleSection>

      <div className="flex flex-col gap-4">
        {GUIDE_PHASES.map((phase) => {
          const items = topics.filter((t) => t.phase === phase.value);
          return (
            <CollapsibleSection
              key={phase.value}
              title={`${phase.label} (${items.length})`}
              description="Urutan tampil untuk maba mengikuti angka di kolom ini."
              defaultOpen={items.length > 0}
            >
              {items.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">Belum ada topik di fase ini.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {items.map((topic) => {
                    const chunks = chunkByArticle.get(topic.id) ?? 0;
                    const expiredTopic = expiryStatus(topic.expiresAt) === "expired";
                    return (
                      <Link
                        key={topic.id}
                        href={`/console/docs/${topic.slug}`}
                        className="flex flex-col gap-1 rounded-md px-3 py-2 hover:bg-surface-container-low transition-colors"
                      >
                        <span className="text-body-lg text-on-background">
                          {topic.sortOrder}. {topic.title}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {topic.section} · {chunks} potongan
                          {topic.reviewedAt
                            ? ` · ditinjau ${topic.reviewedAt.toLocaleDateString("id-ID")}`
                            : " · belum ditinjau"}
                          {topic.expiresAt
                            ? ` · berlaku sampai ${topic.expiresAt.toLocaleDateString("id-ID")}${
                                expiredTopic ? " (lewat)" : ""
                              }`
                            : ""}
                          {topic.isPublic ? "" : " · belum publik"}
                          {topic.sourceLabel ? ` · ${topic.sourceLabel}` : ""}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>
          );
        })}
      </div>
    </div>
  );
}
